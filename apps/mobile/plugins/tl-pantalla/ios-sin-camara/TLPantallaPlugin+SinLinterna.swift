import Foundation
import Capacitor

/* 8e · TLPantalla en un target sin cámara (Repartidor): no hay linterna y no se enlaza la API de la cámara. Ver TLPantallaPlugin.swift. */
extension TLPantallaPlugin {
    @objc func linterna(_ call: CAPPluginCall) { call.resolve(["ok": false]) }
}
