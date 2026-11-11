package com.tolatino.plugins;

import android.content.Intent;
import android.net.Uri;
import android.provider.Settings;
import android.view.WindowManager;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/* 8a · TLPantalla (fase8-apps.md §3.1): la pantalla encendida mientras la Puerta escanea (y desde 8e mientras el Repartidor entrega), el
   brillo al máximo al mostrar un QR (8e) y abrir los Ajustes de ESTA app cuando la persona negó un permiso (la hoja previa lo ofrece).
   Lo encendido y el brillo se devuelven al salir de la app (la ventana los suelta sola) o al llamar con false. Lo usa lib/nativo/pantalla.ts
   y lib/nativo/permisos.ts. Métodos: mantener, brillo, ajustes (los mismos que el iOS). */
@CapacitorPlugin(name = "TLPantalla")
public class TLPantallaPlugin extends Plugin {

    @PluginMethod
    public void mantener(PluginCall call) {
        boolean on = Boolean.TRUE.equals(call.getBoolean("on", false));
        getActivity().runOnUiThread(() -> {
            if (on) getActivity().getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
            else getActivity().getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
            call.resolve();
        });
    }

    @PluginMethod
    public void brillo(PluginCall call) {
        boolean max = Boolean.TRUE.equals(call.getBoolean("max", false));
        getActivity().runOnUiThread(() -> {
            WindowManager.LayoutParams lp = getActivity().getWindow().getAttributes();
            lp.screenBrightness = max ? 1f : WindowManager.LayoutParams.BRIGHTNESS_OVERRIDE_NONE;
            getActivity().getWindow().setAttributes(lp);
            call.resolve();
        });
    }

    @PluginMethod
    public void ajustes(PluginCall call) {
        Intent i = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.fromParts("package", getContext().getPackageName(), null));
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(i);
        call.resolve();
    }
}
