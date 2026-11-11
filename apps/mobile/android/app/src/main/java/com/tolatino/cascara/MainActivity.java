package com.tolatino.cascara;

import android.os.Bundle;
import android.util.Log;
import android.webkit.WebView;
import androidx.webkit.WebViewFeature;
import com.getcapacitor.BridgeActivity;

/* La actividad de las cuatro cáscaras. Los plugins de cada sabor (los oficiales y los propios TL*) se registran solos desde
   assets/capacitor.plugins.json de ese sabor (generado desde apps.json): ninguna app carga un plugin que no usa.

   El puente, solo para nuestro origen y el marco principal (fase8-apps.md §3.1 «Seguridad del WebView»; guardián puenteSoloNuestroOrigen).
   addJavascriptInterface entrega un objeto Java a TODOS los marcos de la página, también a un iframe de otro origen. Capacitor lo usa en tres
   lugares, y aquí se quitan los tres antes de que se cree el primer documento (super.onCreate ya pidió cargar la página, pero la cargó en otro
   turno del hilo; lo quitado aquí no llega a ese documento):
   - «androidBridge»: Capacitor lo instala con addWebMessageListener (solo los orígenes permitidos; el marco principal lo revisa su
     MessageHandler), pero si esa llamada falla —una regla de origen con ruta, un WebView viejo— cae en silencio a addJavascriptInterface.
     Quitarlo siempre deja solo el camino seguro: con el escucha instalado, esto no lo toca; sin él, la app se queda sin puente (lo nativo
     tiene su respaldo web) en vez de entregarlo a cualquiera.
   - «CapacitorHttpAndroidInterface» y «CapacitorCookiesAndroidInterface»: los instalan siempre los plugins internos CapacitorHttp y
     CapacitorCookies (aunque estén apagados), y setCookie() deja a cualquier marco poner una cookie —también HttpOnly— a cualquier dominio.
     Ninguna cáscara los usa (apagados en capacitor.config.json); native-bridge.js revisa que existan antes de usarlos. */
public class MainActivity extends BridgeActivity {

    private static final String[] SIN_MARCOS = { "androidBridge", "CapacitorHttpAndroidInterface", "CapacitorCookiesAndroidInterface" };

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        WebView w = getBridge() == null ? null : getBridge().getWebView();
        if (w == null) return;
        for (String n : SIN_MARCOS) w.removeJavascriptInterface(n);
        if (!WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)) {
            Log.w("TLCascara", "WebView sin addWebMessageListener: la app abre sin puente nativo (lo nativo usa su respaldo web)");
        }
    }
}
