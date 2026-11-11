import Foundation
import Capacitor
import AVFoundation

/* 8e · La linterna de TLPantalla en iOS (solo en los targets con cámara: To'Latino, Negocios y Puerta; generar.mjs). Ver TLPantallaPlugin.swift. */
extension TLPantallaPlugin {
    @objc func linterna(_ call: CAPPluginCall) {
        let on = call.getBool("on") ?? false
        DispatchQueue.main.async {
            guard let d = AVCaptureDevice.default(for: .video), d.hasTorch, d.isTorchAvailable else { call.resolve(["ok": false]); return }
            do {
                try d.lockForConfiguration()
                if on { try d.setTorchModeOn(level: AVCaptureDevice.maxAvailableTorchLevel) } else { d.torchMode = .off }
                d.unlockForConfiguration()
                call.resolve(["ok": true])
            } catch { call.resolve(["ok": false]) }
        }
    }
}
