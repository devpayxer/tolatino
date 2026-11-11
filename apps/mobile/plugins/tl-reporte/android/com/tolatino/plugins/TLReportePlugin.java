package com.tolatino.plugins;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

/* 8a · TLReporte (lo mínimo de 8a; fase8-apps.md §3.1): el registro técnico en anillo (las últimas 200 líneas: pantallas por familia de ruta,
   errores de la página y cambios de señal; nunca lo que la persona escribe). Vive en noBackupFilesDir y sobrevive a un cierre de la app;
   «Reportar un problema» (8f) lo lee solo al tocar «Enviar».
   8f · ultimaCaptura, agitar (evento «agitado») y cierres: la lógica vive en TLReporteBeta.java.
   Métodos: anotar, leer, ultimaCaptura, agitar, cierres (los mismos que el iOS). */
@CapacitorPlugin(name = "TLReporte")
public class TLReportePlugin extends Plugin {

    private static final int ANILLO = 200;
    private final List<String> lineas = new ArrayList<>();
    private boolean cargado = false;
    private TLReporteBeta.Agitar agitado;
    private volatile String captura;

    @Override
    public void load() {
        TLReporteBeta.instalarManejador(getContext());
    }

    private File archivo() {
        return new File(getContext().getNoBackupFilesDir(), "tl-reporte.txt");
    }

    private synchronized void cargar() {
        if (cargado) return;
        cargado = true;
        try {
            File f = archivo();
            if (f.exists()) lineas.addAll(Arrays.asList(new String(Files.readAllBytes(f.toPath()), StandardCharsets.UTF_8).split("\n")));
        } catch (Exception e) { /* empieza vacío */ }
        while (lineas.size() > ANILLO) lineas.remove(0);
    }

    @PluginMethod
    public void anotar(PluginCall call) {
        String l = call.getString("linea", "").replaceAll("[\\p{Cntrl}]", " ");
        if (l.length() > 200) l = l.substring(0, 200);
        synchronized (this) {
            cargar();
            lineas.add(l);
            while (lineas.size() > ANILLO) lineas.remove(0);
            try { Files.write(archivo().toPath(), String.join("\n", lineas).getBytes(StandardCharsets.UTF_8)); } catch (Exception e) { /* solo en memoria */ }
        }
        call.resolve();
    }

    @PluginMethod
    public void leer(PluginCall call) {
        JSArray a = new JSArray();
        synchronized (this) {
            cargar();
            for (String l : lineas) if (!l.isEmpty()) a.put(l);
        }
        JSObject r = new JSObject();
        r.put("lineas", a);
        call.resolve(r);
    }

    @PluginMethod
    public void ultimaCaptura(PluginCall call) {
        JSObject r = new JSObject();
        String c = captura;
        captura = null;
        if (c != null) r.put("imagen", c);
        call.resolve(r);
    }

    @PluginMethod
    public void agitar(PluginCall call) {
        boolean on = Boolean.TRUE.equals(call.getBoolean("on", false));
        getActivity().runOnUiThread(() -> {
            if (agitado == null) agitado = new TLReporteBeta.Agitar(getContext(), () -> getActivity().runOnUiThread(() -> {
                captura = TLReporteBeta.captura(getBridge().getWebView());
                notifyListeners("agitado", new JSObject());
            }));
            agitado.encender(on);
            call.resolve();
        });
    }

    @PluginMethod
    public void cierres(PluginCall call) {
        JSObject r = new JSObject();
        r.put("cierres", TLReporteBeta.tomarCierres(getContext()));
        call.resolve(r);
    }

    @Override
    protected void handleOnPause() {
        if (agitado != null) agitado.encender(false);
        super.handleOnPause();
    }
}
