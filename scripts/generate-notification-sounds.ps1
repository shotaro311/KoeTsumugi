param(
    [string]$OutputDirectory = (Join-Path $PSScriptRoot "..\src-tauri\resources")
)

$ErrorActionPreference = "Stop"
$SampleRate = 44100

function Get-Envelope([double]$Position, [string]$Shape) {
    $attack = [Math]::Min(1.0, $Position / 0.04)
    $release = [Math]::Min(1.0, (1.0 - $Position) / 0.12)
    if ($Shape -eq "marimba") {
        return $attack * $release * [Math]::Exp(-3.8 * $Position)
    }
    return $attack * $release * [Math]::Sin([Math]::PI * [Math]::Min(1.0, $Position))
}

function New-Sound(
    [string]$Path,
    [object[]]$Segments,
    [string]$Shape
) {
    $samples = [System.Collections.Generic.List[int16]]::new()
    foreach ($segment in $Segments) {
        $sampleCount = [Math]::Round($segment.Duration * $SampleRate)
        for ($index = 0; $index -lt $sampleCount; $index++) {
            $position = $index / [Math]::Max(1, $sampleCount - 1)
            $frequency = $segment.StartHz + (($segment.EndHz - $segment.StartHz) * $position)
            $phase = 2.0 * [Math]::PI * $frequency * ($index / $SampleRate)
            $fundamental = [Math]::Sin($phase)
            $harmonic = [Math]::Sin($phase * 2.01) * 0.22
            $upper = [Math]::Sin($phase * 3.98) * 0.08
            $envelope = Get-Envelope $position $Shape
            $sample = [Math]::Round(($fundamental + $harmonic + $upper) * $envelope * 7200)
            $samples.Add([int16][Math]::Clamp($sample, -32767, 32767))
        }
        $gapCount = [Math]::Round($segment.Gap * $SampleRate)
        for ($index = 0; $index -lt $gapCount; $index++) {
            $samples.Add(0)
        }
    }

    $stream = [System.IO.File]::Open($Path, [System.IO.FileMode]::Create)
    $writer = [System.IO.BinaryWriter]::new($stream)
    try {
        $dataSize = $samples.Count * 2
        $writer.Write([Text.Encoding]::ASCII.GetBytes("RIFF"))
        $writer.Write([int](36 + $dataSize))
        $writer.Write([Text.Encoding]::ASCII.GetBytes("WAVE"))
        $writer.Write([Text.Encoding]::ASCII.GetBytes("fmt "))
        $writer.Write([int]16)
        $writer.Write([int16]1)
        $writer.Write([int16]1)
        $writer.Write([int]$SampleRate)
        $writer.Write([int]($SampleRate * 2))
        $writer.Write([int16]2)
        $writer.Write([int16]16)
        $writer.Write([Text.Encoding]::ASCII.GetBytes("data"))
        $writer.Write([int]$dataSize)
        foreach ($sample in $samples) {
            $writer.Write([int16]$sample)
        }
    }
    finally {
        $writer.Dispose()
        $stream.Dispose()
    }
}

New-Item -ItemType Directory -Force -Path $OutputDirectory | Out-Null

$marimbaStart = @(
    [pscustomobject]@{ StartHz = 523.25; EndHz = 523.25; Duration = 0.19; Gap = 0.025 },
    [pscustomobject]@{ StartHz = 659.25; EndHz = 659.25; Duration = 0.24; Gap = 0.0 }
)
$marimbaStop = @(
    [pscustomobject]@{ StartHz = 659.25; EndHz = 659.25; Duration = 0.18; Gap = 0.025 },
    [pscustomobject]@{ StartHz = 440.00; EndHz = 440.00; Duration = 0.28; Gap = 0.0 }
)
$popStart = @(
    [pscustomobject]@{ StartHz = 420.00; EndHz = 760.00; Duration = 0.15; Gap = 0.0 }
)
$popStop = @(
    [pscustomobject]@{ StartHz = 700.00; EndHz = 360.00; Duration = 0.18; Gap = 0.0 }
)

New-Sound (Join-Path $OutputDirectory "marimba_start.wav") $marimbaStart "marimba"
New-Sound (Join-Path $OutputDirectory "marimba_stop.wav") $marimbaStop "marimba"
New-Sound (Join-Path $OutputDirectory "pop_start.wav") $popStart "pop"
New-Sound (Join-Path $OutputDirectory "pop_stop.wav") $popStop "pop"
