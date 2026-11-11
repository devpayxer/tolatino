import UIKit
import WebKit
import Capacitor

/* 8a · El puente solo para nuestro origen (fase8-apps.md §3.1 «Seguridad del WebView»). Capacitor inyecta su JS solo en el marco principal,
   pero el manejador de mensajes «bridge» de WKWebView lo puede llamar CUALQUIER marco (un iframe de otro origen —Stripe o quien sea— podría
   escribir window.webkit.messageHandlers.bridge.postMessage). Aquí se reemplaza por un portero: solo pasan los mensajes del marco principal
   y de nuestro servidor o del origen local de las islas; lo demás se descarta. App-Bound Domains (WKAppBoundDomains) queda declarado y
   apagado hasta comprobar en el simulador que no rompe la hoja de Stripe y su 3-D Secure (a verificar, LAUNCH-CHECKLIST). */
final class TLPortero: NSObject, WKScriptMessageHandler {
    private weak var destino: WKScriptMessageHandler?
    private let hosts: Set<String>
    init(destino: WKScriptMessageHandler, hosts: Set<String>) { self.destino = destino; self.hosts = hosts }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.frameInfo.isMainFrame else { return }
        let o = message.frameInfo.securityOrigin
        let h = o.port > 0 ? "\(o.host):\(o.port)" : o.host
        guard hosts.contains(h.lowercased()) else { return }
        destino?.userContentController(userContentController, didReceive: message)
    }
}

class TLBridgeViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        guard let bridge = bridge as? CapacitorBridge else { return }
        let h = bridge.webViewDelegationHandler
        var hosts: Set<String> = ["localhost"]
        if let s = bridge.config.serverURL.host { hosts.insert((bridge.config.serverURL.port.map { "\(s):\($0)" } ?? s).lowercased()) }
        h.contentController.removeScriptMessageHandler(forName: "bridge")
        h.contentController.add(TLPortero(destino: h, hosts: hosts), name: "bridge")
    }
}
