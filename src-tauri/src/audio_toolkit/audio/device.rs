use cpal::traits::{DeviceTrait, HostTrait};

/// Identifies the input endpoint currently selected as the system default.
///
/// Windows device display names are not unique (two USB or Bluetooth endpoints
/// can have the same name), so use the stable WASAPI endpoint ID there. Other
/// backends do not expose a stable ID in cpal 0.16; the device name is still
/// sufficient to detect the normal system-default switch case on those hosts.
pub fn default_input_device_fingerprint() -> Option<String> {
    #[cfg(target_os = "windows")]
    if let Some(endpoint_id) = windows_default_input_endpoint_id() {
        return Some(format!("endpoint:{endpoint_id}"));
    }

    let host = crate::audio_toolkit::get_cpal_host();
    host.default_input_device()
        .and_then(|device| device.name().ok())
        .map(|name| format!("name:{name}"))
}

#[cfg(target_os = "windows")]
fn windows_default_input_endpoint_id() -> Option<String> {
    use windows::{
        core::PWSTR,
        Win32::{
            Media::Audio::{eCapture, eConsole, IMMDeviceEnumerator, MMDeviceEnumerator},
            System::Com::{
                CoCreateInstance, CoInitializeEx, CoTaskMemFree, CoUninitialize, CLSCTX_ALL,
                COINIT_MULTITHREADED,
            },
        },
    };

    struct ComInitialization(bool);
    impl Drop for ComInitialization {
        fn drop(&mut self) {
            if self.0 {
                unsafe { CoUninitialize() };
            }
        }
    }

    struct CoTaskMemString(PWSTR);
    impl Drop for CoTaskMemString {
        fn drop(&mut self) {
            unsafe { CoTaskMemFree(Some(self.0 .0.cast())) };
        }
    }

    unsafe {
        // RPC_E_CHANGED_MODE means this thread is already initialized with a
        // different apartment model. COM calls are still valid in that case,
        // but only a successful initialization must be balanced here.
        let _com = ComInitialization(CoInitializeEx(None, COINIT_MULTITHREADED).is_ok());
        let enumerator: IMMDeviceEnumerator =
            CoCreateInstance(&MMDeviceEnumerator, None, CLSCTX_ALL).ok()?;
        let device = enumerator
            .GetDefaultAudioEndpoint(eCapture, eConsole)
            .ok()?;
        let endpoint_id = CoTaskMemString(device.GetId().ok()?);
        endpoint_id.0.to_string().ok()
    }
}

pub struct CpalDeviceInfo {
    pub index: String,
    pub name: String,
    pub is_default: bool,
    pub device: cpal::Device,
}

pub fn list_input_devices() -> Result<Vec<CpalDeviceInfo>, Box<dyn std::error::Error>> {
    let host = crate::audio_toolkit::get_cpal_host();
    let default_name = host.default_input_device().and_then(|d| d.name().ok());

    let mut out = Vec::<CpalDeviceInfo>::new();

    for (index, device) in host.input_devices()?.enumerate() {
        let name = device.name().unwrap_or_else(|_| "Unknown".into());

        let is_default = Some(name.clone()) == default_name;

        out.push(CpalDeviceInfo {
            index: index.to_string(),
            name,
            is_default,
            device,
        });
    }

    Ok(out)
}

pub fn list_output_devices() -> Result<Vec<CpalDeviceInfo>, Box<dyn std::error::Error>> {
    let host = crate::audio_toolkit::get_cpal_host();
    let default_name = host.default_output_device().and_then(|d| d.name().ok());

    let mut out = Vec::<CpalDeviceInfo>::new();

    for (index, device) in host.output_devices()?.enumerate() {
        let name = device.name().unwrap_or_else(|_| "Unknown".into());

        let is_default = Some(name.clone()) == default_name;

        out.push(CpalDeviceInfo {
            index: index.to_string(),
            name,
            is_default,
            device,
        });
    }

    Ok(out)
}
