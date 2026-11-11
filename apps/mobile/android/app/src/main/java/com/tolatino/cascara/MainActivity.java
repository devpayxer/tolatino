package com.tolatino.cascara;

import android.net.Uri;
import android.os.Bundle;
import android.util.Log;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;
import androidx.webkit.WebViewAssetLoader;
import androidx.webkit.WebViewCompat;
import androidx.webkit.WebViewFeature;
import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebViewClient;
import java.lang.reflect.Method;
import java.util.Collections;

/* La actividad de las cuatro cáscaras. Los plugins de cada sabor (los oficiales y los propios TL*) se registran solos desde
   assets/capacitor.plugins.json de ese sabor (generado desde apps.json): ninguna app carga un plugin que no usa.

   1. El puente, solo para nuestro origen y el marco principal (fase8-apps.md §3.1 «Seguridad del WebView»; guardián
   puenteSoloNuestroOrigen). addJavascriptInterface entrega un objeto Java a TODOS los marcos de la página, también a un iframe de otro
   origen. Capacitor lo usa en tres lugares, y aquí se quitan los tres antes de que se cree el primer documento (super.onCreate ya pidió
   cargar la página, pero la carga corre en otro turno del hilo; lo quitado aquí no llega a ese documento):
   - «androidBridge»: Capacitor lo instala con addWebMessageListener (solo los orígenes permitidos; el marco principal lo revisa su
     MessageHandler), pero si esa llamada falla —una regla de origen con ruta, un WebView viejo— cae en silencio a addJavascriptInterface.
     Quitarlo siempre deja solo el camino seguro: con el escucha instalado, esto no lo toca; sin él, la app se queda sin puente (lo nativo
     tiene su respaldo web) en vez de entregarlo a cualquiera.
   - «CapacitorHttpAndroidInterface» y «CapacitorCookiesAndroidInterface»: los instalan siempre los plugins internos CapacitorHttp y
     CapacitorCookies (aunque estén apagados), y setCookie() deja a cualquier marco poner una cookie —también HttpOnly— a cualquier dominio.
     Ninguna cáscara los usa (apagados en capacitor.config.json); native-bridge.js revisa que existan antes de usarlos.

   2. El origen local (https://localhost: «Sin señal» y las islas; guardián islaCoherente). Con server.url, Capacitor solo sirve del paquete
   la página de error: lo demás de https://localhost (los /_next/static de la página, la isla) lo manda a la red, y sin señal no carga (la
   página no se hidrataba y la isla no abría). Aquí se sirve TODO https://localhost desde assets/public (WebViewAssetLoader, solo https,
   solo ese dominio), y el JS de Capacitor (puente y cabeceras de los plugins) se inyecta también en ese origen —Capacitor solo lo inyecta
   en el del servidor—, para que la isla use TLLocal (el almacén del teléfono) como la app en línea. Solo nuestro paquete vive ahí.

   3. La red (RedWebView; guardián senalHonesta): la WebView de Android no sigue sola la red del teléfono; se le cuenta aquí, para que
   navigator.onLine y los eventos online/offline digan la verdad (en modo avión, «sin red»). */
public class MainActivity extends BridgeActivity {

    private static final String[] SIN_MARCOS = { "androidBridge", "CapacitorHttpAndroidInterface", "CapacitorCookiesAndroidInterface" };
    private RedWebView red;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        Bridge b = getBridge();
        WebView w = b == null ? null : b.getWebView();
        if (w == null) return;
        for (String n : SIN_MARCOS) w.removeJavascriptInterface(n);
        if (!WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)) {
            Log.w("TLCascara", "WebView sin addWebMessageListener: la app abre sin puente nativo (lo nativo usa su respaldo web)");
        }
        origenLocal(b, w);
        red = new RedWebView(this, w);
        red.empezar();
    }

    @Override
    public void onDestroy() {
        if (red != null) red.parar();
        super.onDestroy();
    }

    private void origenLocal(Bridge b, WebView w) {
        final String host = b.getHost();
        final WebViewAssetLoader.AssetsPathHandler assets = new WebViewAssetLoader.AssetsPathHandler(this);
        final WebViewAssetLoader local = new WebViewAssetLoader.Builder()
            .setDomain(host)
            .addPathHandler("/", (path) -> {
                if (path.contains("..")) return null;
                String p = path.isEmpty() || path.endsWith("/") ? path + "index.html" : path;
                return assets.handle("public/" + p);
            })
            .build();
        b.setWebViewClient(new BridgeWebViewClient(b) {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                Uri u = request.getUrl();
                if (u != null && "https".equalsIgnoreCase(u.getScheme()) && host.equalsIgnoreCase(u.getHost()) && u.getPort() == -1) {
                    WebResourceResponse r = local.shouldInterceptRequest(u);
                    if (r != null) return r;
                }
                return super.shouldInterceptRequest(view, request);
            }
        });
        if (!WebViewFeature.isFeatureSupported(WebViewFeature.DOCUMENT_START_SCRIPT)) return;
        try {
            Method m = Bridge.class.getDeclaredMethod("getJSInjector");
            m.setAccessible(true);
            Object inj = m.invoke(b);
            Method s = inj.getClass().getDeclaredMethod("getScriptString");
            s.setAccessible(true);
            WebViewCompat.addDocumentStartJavaScript(w, (String) s.invoke(inj), Collections.singleton(b.getScheme() + "://" + host));
        } catch (Exception e) {
            Log.w("TLCascara", "sin el JS de Capacitor en el origen local: las islas usan su respaldo web", e);
        }
    }
}
