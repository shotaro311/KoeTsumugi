param(
    [string]$InputPath = (Join-Path $PSScriptRoot "..\assets\branding\app-icon-source-profile-speech.png"),
    [string]$MasterOutput = (Join-Path $PSScriptRoot "..\assets\branding\app-icon-master.png"),
    [string]$FrontendOutput = (Join-Path $PSScriptRoot "..\src\assets\app-icon.png")
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing

function New-RoundedPath([int]$Size, [float]$Radius) {
    $path = [System.Drawing.Drawing2D.GraphicsPath]::new()
    $diameter = $Radius * 2
    $limit = $Size - $diameter
    $path.AddArc(0, 0, $diameter, $diameter, 180, 90)
    $path.AddArc($limit, 0, $diameter, $diameter, 270, 90)
    $path.AddArc($limit, $limit, $diameter, $diameter, 0, 90)
    $path.AddArc(0, $limit, $diameter, $diameter, 90, 90)
    $path.CloseFigure()
    return $path
}

function Save-PreparedIcon(
    [System.Drawing.Image]$Source,
    [string]$OutputPath,
    [int]$Size
) {
    $outputDirectory = Split-Path -Parent $OutputPath
    New-Item -ItemType Directory -Force -Path $outputDirectory | Out-Null

    $bitmap = [System.Drawing.Bitmap]::new(
        $Size,
        $Size,
        [System.Drawing.Imaging.PixelFormat]::Format32bppArgb
    )
    $bitmap.SetResolution(96, 96)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $path = New-RoundedPath $Size ($Size * 0.14)
    try {
        $graphics.Clear([System.Drawing.Color]::Transparent)
        $graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceOver
        $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
        $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
        $graphics.SetClip($path)
        $graphics.DrawImage($Source, 0, 0, $Size, $Size)
        $bitmap.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    }
    finally {
        $path.Dispose()
        $graphics.Dispose()
        $bitmap.Dispose()
    }
}

$resolvedInput = (Resolve-Path -LiteralPath $InputPath).Path
$source = [System.Drawing.Image]::FromFile($resolvedInput)
try {
    Save-PreparedIcon $source $MasterOutput 2048
    Save-PreparedIcon $source $FrontendOutput 512
}
finally {
    $source.Dispose()
}
