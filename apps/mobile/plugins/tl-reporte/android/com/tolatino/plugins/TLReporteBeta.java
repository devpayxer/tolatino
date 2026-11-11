package com.tolatino.plugins;

import android.app.ActivityManager;
import android.app.ApplicationExitInfo;
import android.content.Context;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.os.Build;
import android.util.Base64;
import android.view.View;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.PrintWriter;
import java.io.StringWriter;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.List;

/* 8f · Lo de la beta en TLReporte (fase8-apps.md §4 8f), aparte del plugin para que TLReportePlugin.java cambie poco:
   - Cierres de la vez anterior: el manejador de excepciones de Java (escribe el cierre en noBackupFilesDir y sigue al de antes) y, en Android 11+,
     ApplicationExitInfo (cierres nativos y «la app no respondía»). Se entregan una vez (cierres) y se olvidan. Nada de la persona.
   - Agitar: el acelerómetro SOLO mientras la página lo enciende (builds de prueba); al agitar, la captura del WebView (JPEG en memoria, nunca en
     disco) y el aviso «agitado». La captura sale del teléfono solo si la persona toca «Enviar». */
final class TLReporteBeta {
    private TLReporteBeta() {}

    private static File archivoCierre(Context c) { return new File(c.getNoBackupFilesDir(), "tl-cierre.txt"); }

    /* El manejador de excepciones: una vez por proceso. */
    private static boolean instalado = false;
    static synchronized void instalarManejador(Context ctx) {
        if (instalado) return;
        instalado = true;
        final Context c = ctx.getApplicationContext();
        final Thread.UncaughtExceptionHandler antes = Thread.getDefaultUncaughtExceptionHandler();
        Thread.setDefaultUncaughtExceptionHandler((hilo, e) -> {
            try {
                StringWriter sw = new StringWriter();
                e.printStackTrace(new PrintWriter(sw));
                String pila = sw.toString();
                if (pila.length() > 12000) pila = pila.substring(0, 12000);
                String titulo = "Cierre de la app · " + e.getClass().getName();
                Files.write(archivoCierre(c).toPath(), (titulo + "\n" + pila).getBytes(StandardCharsets.UTF_8));
            } catch (Throwable t) { /* nada: el cierre sigue */ }
            if (antes != null) antes.uncaughtException(hilo, e);
        });
    }

    /* Los cierres guardados y los de ApplicationExitInfo posteriores al último entregado. */
    static JSArray tomarCierres(Context ctx) {
        JSArray a = new JSArray();
        File f = archivoCierre(ctx);
        try {
            if (f.exists()) {
                String t = new String(Files.readAllBytes(f.toPath()), StandardCharsets.UTF_8);
                int i = t.indexOf('\n');
                JSObject o = new JSObject();
                o.put("tipo", "cierre");
                o.put("titulo", i > 0 ? t.substring(0, Math.min(i, 300)) : "Cierre de la app");
                o.put("pila", i > 0 ? t.substring(i + 1) : "");
                a.put(o);
                f.delete();
            }
        } catch (Exception e) { /* sin archivo */ }
        if (Build.VERSION.SDK_INT >= 30) {
            try {
                SharedPreferences p = ctx.getSharedPreferences("tl-reporte", Context.MODE_PRIVATE);
                long ultimo = p.getLong("ultimo_exit", 0), nuevo = ultimo;
                ActivityManager am = (ActivityManager) ctx.getSystemService(Context.ACTIVITY_SERVICE);
                List<ApplicationExitInfo> L = am.getHistoricalProcessExitReasons(ctx.getPackageName(), 0, 5);
                for (ApplicationExitInfo x : L) {
                    if (x.getTimestamp() <= ultimo) continue;
                    nuevo = Math.max(nuevo, x.getTimestamp());
                    int r = x.getReason();
                    if (r != ApplicationExitInfo.REASON_ANR && r != ApplicationExitInfo.REASON_CRASH_NATIVE) continue;
                    JSObject o = new JSObject();
                    o.put("tipo", r == ApplicationExitInfo.REASON_ANR ? "nativo" : "cierre");
                    String d = x.getDescription() == null ? "" : x.getDescription();
                    o.put("titulo", (r == ApplicationExitInfo.REASON_ANR ? "La app no respondía" : "Cierre nativo") + (d.isEmpty() ? "" : " · " + (d.length() > 200 ? d.substring(0, 200) : d)));
                    o.put("pila", "");
                    a.put(o);
                }
                // La primera vez solo se anota desde cuándo (no se mandan cierres de antes de instalar esta versión).
                p.edit().putLong("ultimo_exit", ultimo == 0 ? System.currentTimeMillis() : nuevo).apply();
            } catch (Exception e) { /* sin historial */ }
        }
        return a;
    }

    /* La captura del WebView (en el hilo de la pantalla), reducida a 1600 px de lado, JPEG 70, en base64. */
    static String captura(View v) {
        try {
            int w = v.getWidth(), h = v.getHeight();
            if (w <= 0 || h <= 0) return null;
            Bitmap b = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888);
            v.draw(new Canvas(b));
            float k = Math.min(1f, 1600f / Math.max(w, h));
            Bitmap r = k < 1f ? Bitmap.createScaledBitmap(b, Math.round(w * k), Math.round(h * k), true) : b;
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            r.compress(Bitmap.CompressFormat.JPEG, 70, out);
            if (r != b) r.recycle();
            b.recycle();
            return Base64.encodeToString(out.toByteArray(), Base64.NO_WRAP);
        } catch (Throwable t) { return null; }
    }

    /* Agitar: tres sacudidas fuertes en poco más de un segundo, no más de una vez cada 3 s. */
    static final class Agitar implements SensorEventListener {
        private final SensorManager sm;
        private final Runnable alAgitar;
        private long ultimo = 0;
        private final long[] golpes = new long[3];
        private int n = 0;
        private boolean on = false;

        Agitar(Context c, Runnable alAgitar) {
            this.sm = (SensorManager) c.getSystemService(Context.SENSOR_SERVICE);
            this.alAgitar = alAgitar;
        }

        void encender(boolean v) {
            if (sm == null || v == on) return;
            on = v;
            Sensor s = sm.getDefaultSensor(Sensor.TYPE_ACCELEROMETER);
            if (v && s != null) sm.registerListener(this, s, SensorManager.SENSOR_DELAY_UI);
            else sm.unregisterListener(this);
        }

        @Override
        public void onSensorChanged(SensorEvent e) {
            float x = e.values[0], y = e.values[1], z = e.values[2];
            double g = Math.sqrt(x * x + y * y + z * z) / SensorManager.GRAVITY_EARTH;
            if (g < 2.3) return;
            long ahora = System.currentTimeMillis();
            golpes[n % 3] = ahora;
            n++;
            if (n < 3) return;
            long primero = Math.min(golpes[0], Math.min(golpes[1], golpes[2]));
            if (ahora - primero > 1200 || ahora - ultimo < 3000) return;
            ultimo = ahora;
            n = 0;
            alAgitar.run();
        }

        @Override
        public void onAccuracyChanged(Sensor s, int a) { }
    }
}
