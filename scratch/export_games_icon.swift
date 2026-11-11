// 按桌面版既有原生资源管线，导出 /System/Applications/Games.app 图标为 PNG。
// 运行：cd blog && swift scratch/export_games_icon.swift
import AppKit

let appPath = "/System/Applications/Games.app"
let outDir = "desktop/assets/native"
let icon = NSWorkspace.shared.icon(forFile: appPath)

for size in [128, 256, 512] {
    let rep = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: size, pixelsHigh: size,
                               bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false,
                               colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
    rep.size = NSSize(width: size, height: size)
    NSGraphicsContext.saveGraphicsState()
    let ctx = NSGraphicsContext(bitmapImageRep: rep)!
    NSGraphicsContext.current = ctx
    icon.size = NSSize(width: size, height: size)
    icon.draw(in: NSRect(x: 0, y: 0, width: size, height: size))
    ctx.flushGraphics()
    NSGraphicsContext.restoreGraphicsState()
    guard let png = rep.representation(using: .png, properties: [:]) else { continue }
    let url = URL(fileURLWithPath: "\(outDir)/games-\(size).png")
    try! png.write(to: url)
    print("written \(url.path) bytes=\(png.count)")
}
