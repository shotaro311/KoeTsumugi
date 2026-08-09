param(
    [string]$OutputDirectory = (Join-Path $PSScriptRoot "..\src-tauri\resources"),
    [string]$SourceIcon = (Join-Path $PSScriptRoot "..\assets\branding\app-icon-master.png")
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing

function New-Canvas {
    $bitmap = [System.Drawing.Bitmap]::new(
        64,
        64,
        [System.Drawing.Imaging.PixelFormat]::Format32bppArgb
    )
    $bitmap.SetResolution(96, 96)
    return $bitmap
}

function New-Graphics([System.Drawing.Bitmap]$Bitmap) {
    $graphics = [System.Drawing.Graphics]::FromImage($Bitmap)
    $graphics.Clear([System.Drawing.Color]::Transparent)
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    return $graphics
}

function New-RoundedPen([System.Drawing.Color]$Color, [float]$Width) {
    $pen = [System.Drawing.Pen]::new($Color, $Width)
    $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    return $pen
}

function Save-ScaledIcon([string]$Path) {
    $resolvedSource = (Resolve-Path -LiteralPath $SourceIcon).Path
    $source = [System.Drawing.Image]::FromFile($resolvedSource)
    $bitmap = New-Canvas
    $graphics = New-Graphics $bitmap
    try {
        $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $graphics.DrawImage($source, 0, 0, 64, 64)
        $bitmap.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
    }
    finally {
        $graphics.Dispose()
        $bitmap.Dispose()
        $source.Dispose()
    }
}

function Add-RoundedRectangle(
    [System.Drawing.Graphics]$Graphics,
    [System.Drawing.Brush]$Brush,
    [System.Drawing.RectangleF]$Rectangle,
    [float]$Radius
) {
    $path = [System.Drawing.Drawing2D.GraphicsPath]::new()
    try {
        $diameter = $Radius * 2
        $path.AddArc($Rectangle.X, $Rectangle.Y, $diameter, $diameter, 180, 90)
        $path.AddArc($Rectangle.Right - $diameter, $Rectangle.Y, $diameter, $diameter, 270, 90)
        $path.AddArc($Rectangle.Right - $diameter, $Rectangle.Bottom - $diameter, $diameter, $diameter, 0, 90)
        $path.AddArc($Rectangle.X, $Rectangle.Bottom - $diameter, $diameter, $diameter, 90, 90)
        $path.CloseFigure()
        $Graphics.FillPath($Brush, $path)
    }
    finally {
        $path.Dispose()
    }
}

function Save-BrandIcon([string]$Path, [bool]$Monochrome, [bool]$Dark) {
    $bitmap = New-Canvas
    $graphics = New-Graphics $bitmap
    try {
        $color = if ($Dark) { [System.Drawing.Color]::Black } else { [System.Drawing.Color]::White }
        $profilePen = New-RoundedPen $color 5
        $textPen = New-RoundedPen $color 6
        $profile = [System.Drawing.Drawing2D.GraphicsPath]::new()
        try {
            $profile.AddBezier(10, 50, 8, 39, 8, 20, 18, 13)
            $profile.AddBezier(18, 13, 29, 6, 36, 13, 35, 23)
            $profile.AddBezier(35, 23, 35, 26, 39, 27, 39, 29)
            $profile.AddBezier(39, 29, 36, 30, 37, 32, 39, 33)
            $profile.AddBezier(39, 33, 36, 34, 36, 37, 34, 40)
            $profile.AddBezier(34, 40, 31, 45, 26, 47, 24, 52)
            $graphics.DrawPath($profilePen, $profile)
            $graphics.DrawLine($textPen, 43, 21, 57, 21)
            $graphics.DrawLine($textPen, 43, 32, 57, 32)
            $graphics.DrawLine($textPen, 43, 43, 57, 43)
        }
        finally {
            $profile.Dispose()
            $profilePen.Dispose()
            $textPen.Dispose()
        }

        $bitmap.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
    }
    finally {
        $graphics.Dispose()
        $bitmap.Dispose()
    }
}

function Save-RecordingIcon([string]$Path, [bool]$Monochrome, [bool]$Dark) {
    $bitmap = New-Canvas
    $graphics = New-Graphics $bitmap
    try {
        $first = if ($Monochrome) {
            if ($Dark) { [System.Drawing.Color]::Black } else { [System.Drawing.Color]::White }
        }
        else { [System.Drawing.ColorTranslator]::FromHtml("#47D7E8") }
        $second = if ($Monochrome) { $first } else { [System.Drawing.ColorTranslator]::FromHtml("#39BFA5") }
        $pens = @((New-RoundedPen $first 8), (New-RoundedPen $second 8))
        try {
            $graphics.DrawLine($pens[0], 18, 23, 18, 41)
            $graphics.DrawLine($pens[1], 32, 13, 32, 51)
            $graphics.DrawLine($pens[0], 46, 19, 46, 45)
        }
        finally {
            $pens | ForEach-Object { $_.Dispose() }
        }
        $bitmap.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
    }
    finally {
        $graphics.Dispose()
        $bitmap.Dispose()
    }
}

function Save-TranscribingIcon([string]$Path, [bool]$Monochrome, [bool]$Dark) {
    $bitmap = New-Canvas
    $graphics = New-Graphics $bitmap
    try {
        $bar = if ($Monochrome) {
            if ($Dark) { [System.Drawing.Color]::Black } else { [System.Drawing.Color]::White }
        }
        else { [System.Drawing.ColorTranslator]::FromHtml("#FFB84D") }
        $node = if ($Monochrome) { $bar } else { [System.Drawing.ColorTranslator]::FromHtml("#FF6B6B") }
        $barPen = New-RoundedPen $bar 7
        $nodeBrush = [System.Drawing.SolidBrush]::new($node)
        try {
            $graphics.DrawLine($barPen, 26, 18, 52, 18)
            $graphics.DrawLine($barPen, 26, 32, 52, 32)
            $graphics.DrawLine($barPen, 26, 46, 52, 46)
            $graphics.FillEllipse($nodeBrush, 10, 25, 14, 14)
        }
        finally {
            $barPen.Dispose()
            $nodeBrush.Dispose()
        }
        $bitmap.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
    }
    finally {
        $graphics.Dispose()
        $bitmap.Dispose()
    }
}

New-Item -ItemType Directory -Force -Path $OutputDirectory | Out-Null
Save-ScaledIcon (Join-Path $OutputDirectory "app_idle.png")
Save-BrandIcon (Join-Path $OutputDirectory "tray_idle.png") $true $false
Save-BrandIcon (Join-Path $OutputDirectory "tray_idle_dark.png") $true $true
Save-RecordingIcon (Join-Path $OutputDirectory "recording.png") $false $false
Save-RecordingIcon (Join-Path $OutputDirectory "tray_recording.png") $true $false
Save-RecordingIcon (Join-Path $OutputDirectory "tray_recording_dark.png") $true $true
Save-TranscribingIcon (Join-Path $OutputDirectory "transcribing.png") $false $false
Save-TranscribingIcon (Join-Path $OutputDirectory "tray_transcribing.png") $true $false
Save-TranscribingIcon (Join-Path $OutputDirectory "tray_transcribing_dark.png") $true $true
