package com.tolatino.plugins;

import android.annotation.SuppressLint;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.os.Build;
import android.os.Bundle;
import android.os.IBinder;
import android.os.Looper;
import android.util.Log;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import org.json.JSONArray;
import org.json.JSONObject;

/* 8e · El servicio en primer plano de la ruta del Repartidor (tipo «location», declarado solo en el sabor repartidor; generar.mjs). Mientras corre:
   - El aviso fijo (§1c): «Compartiendo tu ubicación con {negocio} y el cliente · Entrega #{num}» (strings.xml es/en, generado desde apps.json);
     tocarlo abre la app. No se puede quitar mientras comparte.
   - Lee la ubicación del sistema (GPS y, si está, la fusionada; sin Google Play Services) cada cadaS segundos o si se movió minM metros.
   - Cola en el teléfono (archivo privado, fuera de la copia) para cuando no hay señal; sube en lotes de hasta 60 a {servidor}/api/ruta/posicion
     con el token de ESA entrega (Authorization: Bearer). Nunca a otro servidor.
   - Se detiene solo cuando: la página llama detener() («Entregado»), o el servidor contesta 401/410 o «activa: false» (entregada, cancelada,
     reasignada o el interruptor apagado). Al detenerse borra el token, la cola y el aviso.
   Lo que ve la página (TLRutaPlugin.estado): activo, entrega, pendientes, última subida, sin señal. */
public class TLRutaServicio extends Service implements LocationListener {
    private static final String TAG = "TLRuta";
    private static final String CANAL = "tl_ruta";
    private static final int AVISO = 7301;
    private static final int MAX_COLA = 600, LOTE = 60;

    static volatile boolean activo = false, sinSenal = false;
    static volatile String entrega = null;
    static volatile int pendientes = 0;
    static volatile long ultimaEnviada = 0;

    private String servidor, rotulo, token, negocio;
    private int cadaS = 10, minM = 25;
    private final List<JSONObject> cola = new ArrayList<>();
    private Location ultima = null;
    private LocationManager lm;
    private ScheduledExecutorService envio;

    static void detener(Context ctx) {
        ctx.stopService(new Intent(ctx, TLRutaServicio.class));
    }

    @Override
    public IBinder onBind(Intent intent) { return null; }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null || intent.getStringExtra("token") == null) { stopSelf(); return START_NOT_STICKY; }
        String nueva = intent.getStringExtra("entrega");
        boolean otra = entrega != null && !entrega.equals(nueva);
        servidor = intent.getStringExtra("servidor");
        rotulo = intent.getStringExtra("rotulo");
        token = intent.getStringExtra("token");
        negocio = intent.getStringExtra("negocio");
        cadaS = intent.getIntExtra("cadaS", 10);
        minM = intent.getIntExtra("minM", 25);
        if (otra) synchronized (cola) { cola.clear(); }
        entrega = nueva;
        primerPlano();
        if (!activo) { leerCola(); pedirUbicacion(); programarEnvio(); }
        activo = true;
        Log.i(TAG, "comparte la entrega " + entrega);
        // Si el sistema mata el proceso, vuelve con el mismo intent (el mismo token) mientras la entrega no termine.
        return START_REDELIVER_INTENT;
    }

    private void primerPlano() {
        NotificationManager nm = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        if (Build.VERSION.SDK_INT >= 26 && nm != null) {
            NotificationChannel c = new NotificationChannel(CANAL, getString(com.tolatino.cascara.R.string.ruta_canal), NotificationManager.IMPORTANCE_LOW);
            c.setShowBadge(false);
            nm.createNotificationChannel(c);
        }
        Intent abrir = getPackageManager().getLaunchIntentForPackage(getPackageName());
        PendingIntent pi = abrir == null ? null : PendingIntent.getActivity(this, 0, abrir, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
        String texto = getString(com.tolatino.cascara.R.string.ruta_aviso, negocio == null ? "" : negocio, entrega);
        Notification.Builder b = Build.VERSION.SDK_INT >= 26 ? new Notification.Builder(this, CANAL) : new Notification.Builder(this);
        b.setSmallIcon(android.R.drawable.ic_menu_mylocation).setContentTitle(getString(com.tolatino.cascara.R.string.app_name)).setContentText(texto)
            .setStyle(new Notification.BigTextStyle().bigText(texto)).setOngoing(true).setOnlyAlertOnce(true).setCategory(Notification.CATEGORY_SERVICE);
        if (pi != null) b.setContentIntent(pi);
        if (Build.VERSION.SDK_INT >= 31) b.setForegroundServiceBehavior(Notification.FOREGROUND_SERVICE_IMMEDIATE);
        Notification n = b.build();
        if (Build.VERSION.SDK_INT >= 29) startForeground(AVISO, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION);
        else startForeground(AVISO, n);
    }

    @SuppressLint("MissingPermission") // el plugin no arranca el servicio sin el permiso concedido
    private void pedirUbicacion() {
        lm = (LocationManager) getSystemService(LOCATION_SERVICE);
        if (lm == null) return;
        long ms = Math.max(2, cadaS / 2) * 1000L; // la lectura un poco más seguido; se anota cada cadaS o minM
        try {
            if (lm.isProviderEnabled(LocationManager.GPS_PROVIDER)) lm.requestLocationUpdates(LocationManager.GPS_PROVIDER, ms, 0f, this, Looper.getMainLooper());
            if (Build.VERSION.SDK_INT >= 31 && lm.getAllProviders().contains(LocationManager.FUSED_PROVIDER)) lm.requestLocationUpdates(LocationManager.FUSED_PROVIDER, ms, 0f, this, Looper.getMainLooper());
            else if (lm.getAllProviders().contains(LocationManager.NETWORK_PROVIDER) && lm.isProviderEnabled(LocationManager.NETWORK_PROVIDER)) lm.requestLocationUpdates(LocationManager.NETWORK_PROVIDER, ms, 0f, this, Looper.getMainLooper());
        } catch (Exception e) { Log.w(TAG, "sin ubicación: " + e.getClass().getSimpleName()); }
    }

    @Override
    public void onLocationChanged(Location l) {
        if (!activo || l == null) return;
        if (l.hasAccuracy() && l.getAccuracy() > 200) return; // muy imprecisa: no ayuda a nadie
        if (ultima != null) {
            long dt = l.getTime() - ultima.getTime();
            if (dt <= 0) return;
            if (dt < cadaS * 1000L && l.distanceTo(ultima) < minM) return; // cada cadaS segundos o si se movió minM metros
        }
        ultima = l;
        try {
            JSONObject p = new JSONObject();
            p.put("t", l.getTime() > 0 ? l.getTime() : System.currentTimeMillis());
            p.put("lat", l.getLatitude());
            p.put("lng", l.getLongitude());
            if (l.hasAccuracy()) p.put("acc", Math.min(500, l.getAccuracy()));
            if (l.hasSpeed()) p.put("vel", Math.min(100, l.getSpeed()));
            if (l.hasBearing()) p.put("rumbo", l.getBearing() % 360);
            synchronized (cola) {
                cola.add(p);
                while (cola.size() > MAX_COLA) cola.remove(0);
                pendientes = cola.size();
            }
            guardarCola();
        } catch (Exception e) { /* una lectura rota no detiene la ruta */ }
    }
    @Override public void onStatusChanged(String p, int s, Bundle b) { }
    @Override public void onProviderEnabled(String p) { }
    @Override public void onProviderDisabled(String p) { }

    private void programarEnvio() {
        envio = Executors.newSingleThreadScheduledExecutor();
        envio.scheduleWithFixedDelay(this::subir, 1, Math.max(5, cadaS), TimeUnit.SECONDS);
    }

    private void subir() {
        List<JSONObject> lote;
        synchronized (cola) { if (cola.isEmpty() || token == null) return; lote = new ArrayList<>(cola.subList(0, Math.min(LOTE, cola.size()))); }
        HttpURLConnection c = null;
        try {
            JSONObject cuerpo = new JSONObject();
            cuerpo.put("fuente", "app");
            cuerpo.put("p", new JSONArray(lote));
            byte[] b = cuerpo.toString().getBytes(StandardCharsets.UTF_8);
            c = (HttpURLConnection) new URL(servidor + "/api/ruta/posicion").openConnection();
            c.setRequestMethod("POST");
            c.setConnectTimeout(10000); c.setReadTimeout(10000);
            c.setUseCaches(false); c.setInstanceFollowRedirects(false);
            c.setDoOutput(true);
            c.setRequestProperty("Content-Type", "application/json");
            c.setRequestProperty("Authorization", "Bearer " + token);
            if (rotulo != null && !rotulo.isEmpty()) c.setRequestProperty("User-Agent", System.getProperty("http.agent", "Android") + " " + rotulo);
            try (OutputStream o = c.getOutputStream()) { o.write(b); }
            int st = c.getResponseCode();
            String resp = leer(st >= 400 ? c.getErrorStream() : c.getInputStream());
            sinSenal = false;
            boolean activa = true;
            try { activa = new JSONObject(resp).optBoolean("activa", st < 400); } catch (Exception e) { activa = st < 400; }
            if (st == 401 || st == 410 || !activa) { Log.i(TAG, "el servidor terminó la entrega " + entrega); terminar(); return; }
            if (st == 200) {
                synchronized (cola) { cola.subList(0, Math.min(lote.size(), cola.size())).clear(); pendientes = cola.size(); }
                ultimaEnviada = System.currentTimeMillis();
                guardarCola();
            }
        } catch (Exception e) {
            sinSenal = true; // queda en la cola y se sube al volver la señal
        } finally { if (c != null) c.disconnect(); }
    }

    private static String leer(InputStream in) {
        if (in == null) return "";
        try (InputStream x = in; ByteArrayOutputStream o = new ByteArrayOutputStream()) {
            byte[] buf = new byte[4096]; int n, total = 0;
            while ((n = x.read(buf)) > 0 && total < 16384) { o.write(buf, 0, n); total += n; }
            return o.toString("UTF-8");
        } catch (Exception e) { return ""; }
    }

    private void terminar() {
        new android.os.Handler(Looper.getMainLooper()).post(this::stopSelf);
    }

    /* La cola sin señal vive en un archivo privado de la app, fuera de la copia (noBackupFilesDir), y se borra al terminar. */
    private File archivo() { return new File(getNoBackupFilesDir(), "tl-ruta-cola.json"); }
    private void guardarCola() {
        String s; synchronized (cola) { s = new JSONArray(cola).toString(); }
        try (FileOutputStream f = new FileOutputStream(archivo())) { f.write(s.getBytes(StandardCharsets.UTF_8)); } catch (Exception e) { /* sin disco: queda en memoria */ }
    }
    private void leerCola() {
        File f = archivo();
        if (!f.exists()) return;
        try (FileInputStream in = new FileInputStream(f)) {
            JSONArray a = new JSONArray(leer(in));
            synchronized (cola) { for (int i = 0; i < a.length() && cola.size() < MAX_COLA; i++) cola.add(a.getJSONObject(i)); pendientes = cola.size(); }
        } catch (Exception e) { /* una cola rota se descarta */ }
    }

    @Override
    public void onDestroy() {
        activo = false; entrega = null; pendientes = 0; sinSenal = false; token = null;
        if (lm != null) try { lm.removeUpdates(this); } catch (Exception e) { /* ya no miraba */ }
        if (envio != null) envio.shutdownNow();
        synchronized (cola) { cola.clear(); }
        //noinspection ResultOfMethodCallIgnored
        archivo().delete();
        if (Build.VERSION.SDK_INT >= 24) stopForeground(STOP_FOREGROUND_REMOVE); else stopForeground(true);
        Log.i(TAG, "dejó de compartir");
        super.onDestroy();
    }
}
