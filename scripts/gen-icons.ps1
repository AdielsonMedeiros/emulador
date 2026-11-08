Add-Type -AssemblyName System.Drawing
foreach ($size in @(192, 512)) {
    $bmp = New-Object System.Drawing.Bitmap $size, $size
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic

    # Fundo escuro
    $bgBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml('#0f111a'))
    $g.FillRectangle($bgBrush, 0, 0, $size, $size)

    # Circulo central com tom da marca
    $accentBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml('#6366f1'))
    $margin = [int]($size * 0.10)
    $d = $size - (2 * $margin)
    $g.FillEllipse($accentBrush, $margin, $margin, $d, $d)

    # Chassi do gamepad
    $padBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml('#1e2138'))
    $pw = [int]($size * 0.55)
    $ph = [int]($size * 0.32)
    $px = [int](($size - $pw) / 2)
    $py = [int](($size - $ph) / 2)
    $g.FillRectangle($padBrush, $px, $py, $pw, $ph)

    # D-Pad
    $whiteBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::White)
    $dw = [int]($size * 0.05)
    $dh = [int]($size * 0.16)
    $dx = [int]($px + ($pw * 0.22) - ($dw / 2))
    $dy = [int]($py + ($ph / 2) - ($dh / 2))
    $g.FillRectangle($whiteBrush, $dx, $dy, $dw, $dh)
    $g.FillRectangle($whiteBrush, [int]($dx - ($dh - $dw)/2), [int]($dy + ($dh - $dw)/2), $dh, $dw)

    # 4 Botoes de Acao
    $redBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml('#e0564c'))
    $btnR = [int]($size * 0.035)
    $bx = [int]($px + ($pw * 0.78))
    $by = [int]($py + ($ph / 2))
    $g.FillEllipse($redBrush, $bx, [int]($by - $btnR * 1.8), [int]($btnR * 2), [int]($btnR * 2))
    $g.FillEllipse($redBrush, $bx, [int]($by + $btnR * 0.5), [int]($btnR * 2), [int]($btnR * 2))
    $g.FillEllipse($redBrush, [int]($bx - $btnR * 1.6), [int]($by - $btnR * 0.6), [int]($btnR * 2), [int]($btnR * 2))
    $g.FillEllipse($redBrush, [int]($bx + $btnR * 1.6), [int]($by - $btnR * 0.6), [int]($btnR * 2), [int]($btnR * 2))

    $outPath = "covers/icon-$size.png"
    $bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
    Write-Host "Gerado $outPath"
}
