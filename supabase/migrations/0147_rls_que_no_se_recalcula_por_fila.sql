-- 0147_rls_que_no_se_recalcula_por_fila.sql
-- Idempotente (las sentencias son `alter policy` con la expresión final).
-- Aplicar: pegar en el SQL Editor de Supabase y darle a Run.
--
-- DE DÓNDE SALE: el Security Advisor de Supabase marcaba 367 avisos. Al medirlos
-- —separando lo nuestro de lo que trae PostGIS— resultaron ser dos cosas:
--   · 145 políticas RLS que llaman a `auth.uid()` UNA VEZ POR FILA examinada.
--   · 11 funciones nuestras sin `search_path` fijo (ninguna SECURITY DEFINER,
--     que es la combinación que de verdad se puede secuestrar).
--
-- QUÉ ARREGLA ESTO Y QUÉ NO: no es seguridad, es VELOCIDAD. `auth.uid()` no
-- depende de la fila, así que envolverla en `(select auth.uid())` hace que
-- Postgres la evalúe UNA sola vez (un `InitPlan`) en lugar de una vez por fila.
--
-- MEDIDO, no supuesto — sobre 2.101 filas, en el camino sin índice (que es el
-- que aparece a escala):
--     envuelto     → 0,345 · 0,321 ms
--     sin envolver → 3,100 · 3,167 · 3,128 ms
-- Unas 10 veces más rápido, y la diferencia CRECE con cada fila. Con índice y
-- pocas filas no se nota nada: la ganancia está en el volumen, que es
-- exactamente para lo que se hace esto ahora y no después.
--
-- CÓMO SE COMPROBÓ QUE NADIE VE UNA FILA DE MÁS (las dos, no una):
--   1. HUELLA DE FILAS: para 62 tablas con RLS y CINCO identidades distintas
--      (anónimo, tres usuarios y un dueño de negocio) se calculó `count` + `md5`
--      de las claves visibles ANTES y DESPUÉS. 310 mediciones, CERO diferencias.
--      Las cinco identidades ven cosas distintas entre sí (hasta 11 tablas de
--      diferencia), así que la huella discrimina: si algo se hubiera abierto, se
--      habría visto.
--   2. TEXTO NORMALIZADO: se comparó la expresión de cada política antes y
--      después deshaciendo el envoltorio. 145 de 145 idénticas, 0 con cualquier
--      otro cambio. Esto cubre además las políticas de INSERT/UPDATE/DELETE, que
--      una huella de lecturas no puede probar.
--
-- Las dos bases tenían la MISMA firma de políticas (160, md5 c5ed3537…), así que
-- lo generado en pruebas vale igual en producción.

alter policy "insert business_bookings" on public.business_bookings
  with check ((((user_id = ( SELECT auth.uid() )) AND (status = ANY (ARRAY['pending'::text, 'confirmed'::text])) AND (COALESCE(deposit, (0)::numeric) >= (0)::numeric) AND (COALESCE(deposit, (0)::numeric) <= (100000)::numeric)) OR (EXISTS ( SELECT 1
   FROM businesses b
  WHERE ((b.id = business_bookings.business_id) AND (b.owner_id = ( SELECT auth.uid() )))))));

alter policy "read business_bookings" on public.business_bookings
  using (((user_id = ( SELECT auth.uid() )) OR (EXISTS ( SELECT 1
   FROM businesses b
  WHERE ((b.id = business_bookings.business_id) AND (b.owner_id = ( SELECT auth.uid() )))))));

alter policy "update business_bookings" on public.business_bookings
  using (((user_id = ( SELECT auth.uid() )) OR (EXISTS ( SELECT 1
   FROM businesses b
  WHERE ((b.id = business_bookings.business_id) AND (b.owner_id = ( SELECT auth.uid() )))))))
  with check (((user_id = ( SELECT auth.uid() )) OR (EXISTS ( SELECT 1
   FROM businesses b
  WHERE ((b.id = business_bookings.business_id) AND (b.owner_id = ( SELECT auth.uid() )))))));

alter policy "customer read own conversations" on public.business_conversations
  using ((customer_user_id = ( SELECT auth.uid() )));

alter policy "customer update own conversations" on public.business_conversations
  using ((customer_user_id = ( SELECT auth.uid() )))
  with check ((customer_user_id = ( SELECT auth.uid() )));

alter policy "owner all business_conversations" on public.business_conversations
  using ((EXISTS ( SELECT 1
   FROM businesses b
  WHERE ((b.id = business_conversations.business_id) AND (b.owner_id = ( SELECT auth.uid() ))))))
  with check ((EXISTS ( SELECT 1
   FROM businesses b
  WHERE ((b.id = business_conversations.business_id) AND (b.owner_id = ( SELECT auth.uid() ))))));

alter policy "owner all business_customers" on public.business_customers
  using ((EXISTS ( SELECT 1
   FROM businesses b
  WHERE ((b.id = business_customers.business_id) AND (b.owner_id = ( SELECT auth.uid() ))))))
  with check ((EXISTS ( SELECT 1
   FROM businesses b
  WHERE ((b.id = business_customers.business_id) AND (b.owner_id = ( SELECT auth.uid() ))))));

alter policy "delete own endorsement" on public.business_endorsements
  using ((user_id = ( SELECT auth.uid() )));

alter policy "insert own endorsement" on public.business_endorsements
  with check ((user_id = ( SELECT auth.uid() )));

alter policy "read own endorsement" on public.business_endorsements
  using ((user_id = ( SELECT auth.uid() )));

alter policy "owner delete business_items" on public.business_items
  using ((EXISTS ( SELECT 1
   FROM businesses b
  WHERE ((b.id = business_items.business_id) AND (b.owner_id = ( SELECT auth.uid() ))))));

alter policy "owner insert business_items" on public.business_items
  with check ((EXISTS ( SELECT 1
   FROM businesses b
  WHERE ((b.id = business_items.business_id) AND (b.owner_id = ( SELECT auth.uid() ))))));

alter policy "owner update business_items" on public.business_items
  using ((EXISTS ( SELECT 1
   FROM businesses b
  WHERE ((b.id = business_items.business_id) AND (b.owner_id = ( SELECT auth.uid() ))))))
  with check ((EXISTS ( SELECT 1
   FROM businesses b
  WHERE ((b.id = business_items.business_id) AND (b.owner_id = ( SELECT auth.uid() ))))));

alter policy "owner delete business_jobs" on public.business_jobs
  using ((EXISTS ( SELECT 1
   FROM businesses b
  WHERE ((b.id = business_jobs.business_id) AND (b.owner_id = ( SELECT auth.uid() ))))));

alter policy "owner insert business_jobs" on public.business_jobs
  with check ((EXISTS ( SELECT 1
   FROM businesses b
  WHERE ((b.id = business_jobs.business_id) AND (b.owner_id = ( SELECT auth.uid() ))))));

alter policy "owner update business_jobs" on public.business_jobs
  using ((EXISTS ( SELECT 1
   FROM businesses b
  WHERE ((b.id = business_jobs.business_id) AND (b.owner_id = ( SELECT auth.uid() ))))))
  with check ((EXISTS ( SELECT 1
   FROM businesses b
  WHERE ((b.id = business_jobs.business_id) AND (b.owner_id = ( SELECT auth.uid() ))))));

alter policy "customer read own conv messages" on public.business_messages
  using ((EXISTS ( SELECT 1
   FROM business_conversations c
  WHERE ((c.id = business_messages.conversation_id) AND (c.customer_user_id = ( SELECT auth.uid() ))))));

alter policy "customer send own conv messages" on public.business_messages
  with check (((from_owner = false) AND (EXISTS ( SELECT 1
   FROM business_conversations c
  WHERE ((c.id = business_messages.conversation_id) AND (c.customer_user_id = ( SELECT auth.uid() )))))));

alter policy "owner all business_messages" on public.business_messages
  using ((EXISTS ( SELECT 1
   FROM (business_conversations c
     JOIN businesses b ON ((b.id = c.business_id)))
  WHERE ((c.id = business_messages.conversation_id) AND (b.owner_id = ( SELECT auth.uid() ))))))
  with check ((EXISTS ( SELECT 1
   FROM (business_conversations c
     JOIN businesses b ON ((b.id = c.business_id)))
  WHERE ((c.id = business_messages.conversation_id) AND (b.owner_id = ( SELECT auth.uid() ))))));

alter policy "bmd_owner_read" on public.business_metric_daily
  using ((EXISTS ( SELECT 1
   FROM businesses b
  WHERE ((b.id = business_metric_daily.business_id) AND (b.owner_id = ( SELECT auth.uid() ))))));

alter policy "insert business_orders" on public.business_orders
  with check ((EXISTS ( SELECT 1
   FROM businesses b
  WHERE ((b.id = business_orders.business_id) AND (b.owner_id = ( SELECT auth.uid() ))))));

alter policy "read business_orders" on public.business_orders
  using (((user_id = ( SELECT auth.uid() )) OR (EXISTS ( SELECT 1
   FROM businesses b
  WHERE ((b.id = business_orders.business_id) AND (b.owner_id = ( SELECT auth.uid() )))))));

alter policy "update business_orders" on public.business_orders
  using (((user_id = ( SELECT auth.uid() )) OR (EXISTS ( SELECT 1
   FROM businesses b
  WHERE ((b.id = business_orders.business_id) AND (b.owner_id = ( SELECT auth.uid() )))))))
  with check (((user_id = ( SELECT auth.uid() )) OR (EXISTS ( SELECT 1
   FROM businesses b
  WHERE ((b.id = business_orders.business_id) AND (b.owner_id = ( SELECT auth.uid() )))))));

alter policy "owner delete business_photos" on public.business_photos
  using ((EXISTS ( SELECT 1
   FROM businesses b
  WHERE ((b.id = business_photos.business_id) AND (b.owner_id = ( SELECT auth.uid() ))))));

alter policy "owner insert business_photos" on public.business_photos
  with check ((EXISTS ( SELECT 1
   FROM businesses b
  WHERE ((b.id = business_photos.business_id) AND (b.owner_id = ( SELECT auth.uid() ))))));

alter policy "owner update business_photos" on public.business_photos
  using ((EXISTS ( SELECT 1
   FROM businesses b
  WHERE ((b.id = business_photos.business_id) AND (b.owner_id = ( SELECT auth.uid() ))))))
  with check ((EXISTS ( SELECT 1
   FROM businesses b
  WHERE ((b.id = business_photos.business_id) AND (b.owner_id = ( SELECT auth.uid() ))))));

alter policy "delete own relations" on public.business_relations
  using (((EXISTS ( SELECT 1
   FROM businesses b
  WHERE ((b.id = business_relations.source_id) AND (b.owner_id = ( SELECT auth.uid() ))))) OR (EXISTS ( SELECT 1
   FROM businesses b
  WHERE ((b.id = business_relations.target_id) AND (b.owner_id = ( SELECT auth.uid() )))))));

alter policy "read own relations" on public.business_relations
  using (((EXISTS ( SELECT 1
   FROM businesses b
  WHERE ((b.id = business_relations.source_id) AND (b.owner_id = ( SELECT auth.uid() ))))) OR (EXISTS ( SELECT 1
   FROM businesses b
  WHERE ((b.id = business_relations.target_id) AND (b.owner_id = ( SELECT auth.uid() )))))));

alter policy "read own or owned rental order" on public.business_rental_orders
  using (((user_id = ( SELECT auth.uid() )) OR (EXISTS ( SELECT 1
   FROM businesses b
  WHERE ((b.id = business_rental_orders.business_id) AND (b.owner_id = ( SELECT auth.uid() )))))));

alter policy "update own or owned rental order" on public.business_rental_orders
  using (((user_id = ( SELECT auth.uid() )) OR (EXISTS ( SELECT 1
   FROM businesses b
  WHERE ((b.id = business_rental_orders.business_id) AND (b.owner_id = ( SELECT auth.uid() )))))));

alter policy "insert business_rentals" on public.business_rentals
  with check ((((user_id = ( SELECT auth.uid() )) AND (status = 'pending'::text) AND ((COALESCE(total, (0)::numeric) >= (0)::numeric) AND (COALESCE(total, (0)::numeric) <= (100000)::numeric)) AND ((COALESCE(deposit, (0)::numeric) >= (0)::numeric) AND (COALESCE(deposit, (0)::numeric) <= (100000)::numeric))) OR (EXISTS ( SELECT 1
   FROM businesses b
  WHERE ((b.id = business_rentals.business_id) AND (b.owner_id = ( SELECT auth.uid() )))))));

alter policy "read business_rentals" on public.business_rentals
  using (((user_id = ( SELECT auth.uid() )) OR (EXISTS ( SELECT 1
   FROM businesses b
  WHERE ((b.id = business_rentals.business_id) AND (b.owner_id = ( SELECT auth.uid() )))))));

alter policy "update business_rentals" on public.business_rentals
  using (((user_id = ( SELECT auth.uid() )) OR (EXISTS ( SELECT 1
   FROM businesses b
  WHERE ((b.id = business_rentals.business_id) AND (b.owner_id = ( SELECT auth.uid() )))))))
  with check (((user_id = ( SELECT auth.uid() )) OR (EXISTS ( SELECT 1
   FROM businesses b
  WHERE ((b.id = business_rentals.business_id) AND (b.owner_id = ( SELECT auth.uid() )))))));

alter policy "owner delete business_staff" on public.business_staff
  using ((EXISTS ( SELECT 1
   FROM businesses b
  WHERE ((b.id = business_staff.business_id) AND (b.owner_id = ( SELECT auth.uid() ))))));

alter policy "owner insert business_staff" on public.business_staff
  with check ((EXISTS ( SELECT 1
   FROM businesses b
  WHERE ((b.id = business_staff.business_id) AND (b.owner_id = ( SELECT auth.uid() ))))));

alter policy "owner read business_staff" on public.business_staff
  using ((EXISTS ( SELECT 1
   FROM businesses b
  WHERE ((b.id = business_staff.business_id) AND (b.owner_id = ( SELECT auth.uid() ))))));

alter policy "owner update business_staff" on public.business_staff
  using ((EXISTS ( SELECT 1
   FROM businesses b
  WHERE ((b.id = business_staff.business_id) AND (b.owner_id = ( SELECT auth.uid() ))))))
  with check ((EXISTS ( SELECT 1
   FROM businesses b
  WHERE ((b.id = business_staff.business_id) AND (b.owner_id = ( SELECT auth.uid() ))))));

alter policy "owner reads subscription" on public.business_subscriptions
  using ((EXISTS ( SELECT 1
   FROM businesses b
  WHERE ((b.id = business_subscriptions.business_id) AND (b.owner_id = ( SELECT auth.uid() ))))));

alter policy "like as self" on public.business_update_likes
  with check ((( SELECT auth.uid() ) = user_id));

alter policy "read own update likes" on public.business_update_likes
  using ((( SELECT auth.uid() ) = user_id));

alter policy "unlike as self" on public.business_update_likes
  using ((( SELECT auth.uid() ) = user_id));

alter policy "owner delete business_updates" on public.business_updates
  using ((EXISTS ( SELECT 1
   FROM businesses b
  WHERE ((b.id = business_updates.business_id) AND (b.owner_id = ( SELECT auth.uid() ))))));

alter policy "owner insert business_updates" on public.business_updates
  with check ((EXISTS ( SELECT 1
   FROM businesses b
  WHERE ((b.id = business_updates.business_id) AND (b.owner_id = ( SELECT auth.uid() ))))));

alter policy "owner update business_updates" on public.business_updates
  using ((EXISTS ( SELECT 1
   FROM businesses b
  WHERE ((b.id = business_updates.business_id) AND (b.owner_id = ( SELECT auth.uid() ))))))
  with check ((EXISTS ( SELECT 1
   FROM businesses b
  WHERE ((b.id = business_updates.business_id) AND (b.owner_id = ( SELECT auth.uid() ))))));

alter policy "public read business_updates" on public.business_updates
  using (((status = 'live'::text) OR (EXISTS ( SELECT 1
   FROM businesses b
  WHERE ((b.id = business_updates.business_id) AND (b.owner_id = ( SELECT auth.uid() )))))));

alter policy "delete own business" on public.businesses
  using ((( SELECT auth.uid() ) = owner_id));

alter policy "owner reads own business" on public.businesses
  using ((( SELECT auth.uid() ) = owner_id));

alter policy "update own business" on public.businesses
  using ((( SELECT auth.uid() ) = owner_id))
  with check ((( SELECT auth.uid() ) = owner_id));

alter policy "claim insert own" on public.claims
  with check ((claimant_id = ( SELECT auth.uid() )));

alter policy "claim read parties" on public.claims
  using (((claimant_id = ( SELECT auth.uid() )) OR (EXISTS ( SELECT 1
   FROM businesses b
  WHERE ((b.id = claims.business_id) AND (b.owner_id = ( SELECT auth.uid() )))))));

alter policy "own delete comment_likes" on public.comment_likes
  using ((( SELECT auth.uid() ) = user_id));

alter policy "own read comment_likes" on public.comment_likes
  using ((( SELECT auth.uid() ) = user_id));

alter policy "own write comment_likes" on public.comment_likes
  with check ((( SELECT auth.uid() ) = user_id));

alter policy "own delete event_attendance" on public.event_attendance
  using ((user_id = ( SELECT auth.uid() )));

alter policy "own insert event_attendance" on public.event_attendance
  with check ((user_id = ( SELECT auth.uid() )));

alter policy "owner delete promo" on public.event_promo_codes
  using ((EXISTS ( SELECT 1
   FROM events e
  WHERE ((e.id = event_promo_codes.event_id) AND (e.owner_id = ( SELECT auth.uid() ))))));

alter policy "owner insert promo" on public.event_promo_codes
  with check ((EXISTS ( SELECT 1
   FROM events e
  WHERE ((e.id = event_promo_codes.event_id) AND (e.owner_id = ( SELECT auth.uid() ))))));

alter policy "owner read promo" on public.event_promo_codes
  using ((EXISTS ( SELECT 1
   FROM events e
  WHERE ((e.id = event_promo_codes.event_id) AND (e.owner_id = ( SELECT auth.uid() ))))));

alter policy "owner update promo" on public.event_promo_codes
  using ((EXISTS ( SELECT 1
   FROM events e
  WHERE ((e.id = event_promo_codes.event_id) AND (e.owner_id = ( SELECT auth.uid() ))))))
  with check ((EXISTS ( SELECT 1
   FROM events e
  WHERE ((e.id = event_promo_codes.event_id) AND (e.owner_id = ( SELECT auth.uid() ))))));

alter policy "own delete event review" on public.event_reviews
  using ((( SELECT auth.uid() ) = user_id));

alter policy "read event_tickets" on public.event_tickets
  using (((user_id = ( SELECT auth.uid() )) OR (EXISTS ( SELECT 1
   FROM events e
  WHERE ((e.id = event_tickets.event_id) AND (e.owner_id = ( SELECT auth.uid() )))))));

alter policy "owner delete tiers" on public.event_tiers
  using ((EXISTS ( SELECT 1
   FROM events e
  WHERE ((e.id = event_tiers.event_id) AND (e.owner_id = ( SELECT auth.uid() ))))));

alter policy "owner insert tiers" on public.event_tiers
  with check ((EXISTS ( SELECT 1
   FROM events e
  WHERE ((e.id = event_tiers.event_id) AND (e.owner_id = ( SELECT auth.uid() ))))));

alter policy "owner update tiers" on public.event_tiers
  using ((EXISTS ( SELECT 1
   FROM events e
  WHERE ((e.id = event_tiers.event_id) AND (e.owner_id = ( SELECT auth.uid() ))))))
  with check ((EXISTS ( SELECT 1
   FROM events e
  WHERE ((e.id = event_tiers.event_id) AND (e.owner_id = ( SELECT auth.uid() ))))));

alter policy "public read visible tiers" on public.event_tiers
  using ((visible OR (EXISTS ( SELECT 1
   FROM events e
  WHERE ((e.id = event_tiers.event_id) AND (e.owner_id = ( SELECT auth.uid() )))))));

alter policy "waitlist delete own" on public.event_waitlist
  using ((user_id = ( SELECT auth.uid() )));

alter policy "waitlist insert own" on public.event_waitlist
  with check ((user_id = ( SELECT auth.uid() )));

alter policy "waitlist read own or owner" on public.event_waitlist
  using (((user_id = ( SELECT auth.uid() )) OR (EXISTS ( SELECT 1
   FROM events e
  WHERE ((e.id = event_waitlist.event_id) AND (e.owner_id = ( SELECT auth.uid() )))))));

alter policy "owner delete events" on public.events
  using ((( SELECT auth.uid() ) = owner_id));

alter policy "owner update events" on public.events
  using ((( SELECT auth.uid() ) = owner_id))
  with check ((( SELECT auth.uid() ) = owner_id));

alter policy "public read events" on public.events
  using (((status <> 'draft'::text) OR (( SELECT auth.uid() ) = owner_id)));

alter policy "delete own feature suggestions" on public.feature_suggestions
  using (((status = 'pending'::text) AND (EXISTS ( SELECT 1
   FROM businesses b
  WHERE ((b.id = feature_suggestions.business_id) AND (b.owner_id = ( SELECT auth.uid() )))))));

alter policy "insert own feature suggestions" on public.feature_suggestions
  with check (((status = 'pending'::text) AND (EXISTS ( SELECT 1
   FROM businesses b
  WHERE ((b.id = feature_suggestions.business_id) AND (b.owner_id = ( SELECT auth.uid() )))))));

alter policy "read own feature suggestions" on public.feature_suggestions
  using ((EXISTS ( SELECT 1
   FROM businesses b
  WHERE ((b.id = feature_suggestions.business_id) AND (b.owner_id = ( SELECT auth.uid() ))))));

alter policy "follow as self" on public.follows
  with check ((( SELECT auth.uid() ) = follower_id));

alter policy "unfollow as self" on public.follows
  using ((( SELECT auth.uid() ) = follower_id));

alter policy "own notifications read" on public.notifications
  using ((user_id = ( SELECT auth.uid() )));

alter policy "own notifications update" on public.notifications
  using ((user_id = ( SELECT auth.uid() )))
  with check ((user_id = ( SELECT auth.uid() )));

alter policy "owner reads payments" on public.payments
  using (((EXISTS ( SELECT 1
   FROM businesses b
  WHERE ((b.id = payments.business_id) AND (b.owner_id = ( SELECT auth.uid() ))))) OR (buyer_id = ( SELECT auth.uid() ))));

alter policy "buyer reads own pending" on public.pending_purchases
  using ((buyer_id = ( SELECT auth.uid() )));

alter policy "read own poll vote" on public.poll_votes
  using ((( SELECT auth.uid() ) = user_id));

alter policy "delete own comment" on public.post_comments
  using ((( SELECT auth.uid() ) = author_id));

alter policy "insert own comment" on public.post_comments
  with check ((( SELECT auth.uid() ) = author_id));

alter policy "public read comments" on public.post_comments
  using (((NOT hidden) AND (NOT (EXISTS ( SELECT 1
   FROM user_blocks b
  WHERE ((b.blocker_id = ( SELECT auth.uid() )) AND (b.blocked_id = post_comments.author_id)))))));

alter policy "own delete post_likes" on public.post_likes
  using ((( SELECT auth.uid() ) = user_id));

alter policy "own read post_likes" on public.post_likes
  using ((( SELECT auth.uid() ) = user_id));

alter policy "own write post_likes" on public.post_likes
  with check (((( SELECT auth.uid() ) = user_id) AND (EXISTS ( SELECT 1
   FROM posts p
  WHERE ((p.id = post_likes.post_id) AND (NOT p.hidden) AND (NOT (EXISTS ( SELECT 1
           FROM user_blocks b
          WHERE ((b.blocker_id = p.author_id) AND (b.blocked_id = ( SELECT auth.uid() )))))))))));

alter policy "insert own report" on public.post_reports
  with check ((( SELECT auth.uid() ) = reporter_id));

alter policy "read own report" on public.post_reports
  using ((( SELECT auth.uid() ) = reporter_id));

alter policy "delete own posts" on public.posts
  using ((( SELECT auth.uid() ) = author_id));

alter policy "insert own posts" on public.posts
  with check ((( SELECT auth.uid() ) = author_id));

alter policy "public read posts" on public.posts
  using (((NOT hidden) AND (NOT (EXISTS ( SELECT 1
   FROM user_blocks b
  WHERE ((b.blocker_id = ( SELECT auth.uid() )) AND (b.blocked_id = posts.author_id)))))));

alter policy "update own posts" on public.posts
  using ((( SELECT auth.uid() ) = author_id))
  with check ((( SELECT auth.uid() ) = author_id));

alter policy "insert own profile" on public.profiles
  with check ((( SELECT auth.uid() ) = id));

alter policy "self read profiles" on public.profiles
  using ((id = ( SELECT auth.uid() )));

alter policy "update own profile" on public.profiles
  using ((( SELECT auth.uid() ) = id))
  with check ((( SELECT auth.uid() ) = id));

alter policy "owner delete properties" on public.properties
  using ((owner_id = ( SELECT auth.uid() )));

alter policy "owner insert properties" on public.properties
  with check ((owner_id = ( SELECT auth.uid() )));

alter policy "owner update properties" on public.properties
  using ((owner_id = ( SELECT auth.uid() )))
  with check ((owner_id = ( SELECT auth.uid() )));

alter policy "public read published properties" on public.properties
  using (((status = ANY (ARRAY['published'::text, 'pending'::text, 'rented'::text, 'sold'::text])) OR (owner_id = ( SELECT auth.uid() ))));

alter policy "lead read own or agent" on public.property_leads
  using (((user_id = ( SELECT auth.uid() )) OR (EXISTS ( SELECT 1
   FROM properties p
  WHERE ((p.id = property_leads.property_id) AND (p.owner_id = ( SELECT auth.uid() )))))));

alter policy "lead stage update by agent" on public.property_leads
  using ((EXISTS ( SELECT 1
   FROM properties p
  WHERE ((p.id = property_leads.property_id) AND (p.owner_id = ( SELECT auth.uid() ))))))
  with check ((EXISTS ( SELECT 1
   FROM properties p
  WHERE ((p.id = property_leads.property_id) AND (p.owner_id = ( SELECT auth.uid() ))))));

alter policy "own saves delete" on public.property_saves
  using ((user_id = ( SELECT auth.uid() )));

alter policy "own saves insert" on public.property_saves
  with check ((user_id = ( SELECT auth.uid() )));

alter policy "own saves read" on public.property_saves
  using ((user_id = ( SELECT auth.uid() )));

alter policy "tour cancel by visitor" on public.property_tours
  using ((user_id = ( SELECT auth.uid() )))
  with check ((user_id = ( SELECT auth.uid() )));

alter policy "tour read own or agent" on public.property_tours
  using (((user_id = ( SELECT auth.uid() )) OR (EXISTS ( SELECT 1
   FROM properties p
  WHERE ((p.id = property_tours.property_id) AND (p.owner_id = ( SELECT auth.uid() )))))));

alter policy "tour update by agent" on public.property_tours
  using ((EXISTS ( SELECT 1
   FROM properties p
  WHERE ((p.id = property_tours.property_id) AND (p.owner_id = ( SELECT auth.uid() ))))))
  with check ((EXISTS ( SELECT 1
   FROM properties p
  WHERE ((p.id = property_tours.property_id) AND (p.owner_id = ( SELECT auth.uid() ))))));

alter policy "own push subs delete" on public.push_subscriptions
  using ((user_id = ( SELECT auth.uid() )));

alter policy "own push subs insert" on public.push_subscriptions
  with check ((user_id = ( SELECT auth.uid() )));

alter policy "own push subs select" on public.push_subscriptions
  using ((user_id = ( SELECT auth.uid() )));

alter policy "own push subs update" on public.push_subscriptions
  using ((user_id = ( SELECT auth.uid() )))
  with check ((user_id = ( SELECT auth.uid() )));

alter policy "own report insert" on public.reports
  with check ((reporter_id = ( SELECT auth.uid() )));

alter policy "own report read" on public.reports
  using ((reporter_id = ( SELECT auth.uid() )));

alter policy "author delete own review" on public.reviews
  using ((user_id = ( SELECT auth.uid() )));

alter policy "author insert own review" on public.reviews
  with check ((user_id = ( SELECT auth.uid() )));

alter policy "author update own review" on public.reviews
  using ((user_id = ( SELECT auth.uid() )))
  with check ((user_id = ( SELECT auth.uid() )));

alter policy "delete own saved businesses" on public.saved_businesses
  using ((( SELECT auth.uid() ) = user_id));

alter policy "insert own saved businesses" on public.saved_businesses
  with check ((( SELECT auth.uid() ) = user_id));

alter policy "read own saved businesses" on public.saved_businesses
  using ((( SELECT auth.uid() ) = user_id));

alter policy "own delete saved_posts" on public.saved_posts
  using ((( SELECT auth.uid() ) = user_id));

alter policy "own read saved_posts" on public.saved_posts
  using ((( SELECT auth.uid() ) = user_id));

alter policy "own write saved_posts" on public.saved_posts
  with check ((( SELECT auth.uid() ) = user_id));

alter policy "delete own subcat suggestions" on public.subcategory_suggestions
  using (((status = 'pending'::text) AND (EXISTS ( SELECT 1
   FROM businesses b
  WHERE ((b.id = subcategory_suggestions.business_id) AND (b.owner_id = ( SELECT auth.uid() )))))));

alter policy "insert own subcat suggestions" on public.subcategory_suggestions
  with check (((status = 'pending'::text) AND (EXISTS ( SELECT 1
   FROM businesses b
  WHERE ((b.id = subcategory_suggestions.business_id) AND (b.owner_id = ( SELECT auth.uid() )))))));

alter policy "read own subcat suggestions" on public.subcategory_suggestions
  using ((EXISTS ( SELECT 1
   FROM businesses b
  WHERE ((b.id = subcategory_suggestions.business_id) AND (b.owner_id = ( SELECT auth.uid() ))))));

alter policy "own delete address" on public.user_addresses
  using ((( SELECT auth.uid() ) = user_id));

alter policy "own insert address" on public.user_addresses
  with check ((( SELECT auth.uid() ) = user_id));

alter policy "own read addresses" on public.user_addresses
  using ((( SELECT auth.uid() ) = user_id));

alter policy "own update address" on public.user_addresses
  using ((( SELECT auth.uid() ) = user_id))
  with check ((( SELECT auth.uid() ) = user_id));

alter policy "delete own block" on public.user_blocks
  using ((blocker_id = ( SELECT auth.uid() )));

alter policy "insert own block" on public.user_blocks
  with check ((blocker_id = ( SELECT auth.uid() )));

alter policy "read own blocks" on public.user_blocks
  using ((blocker_id = ( SELECT auth.uid() )));

alter policy "vlead read own or dealer" on public.vehicle_leads
  using (((user_id = ( SELECT auth.uid() )) OR (EXISTS ( SELECT 1
   FROM vehicles v
  WHERE ((v.id = vehicle_leads.vehicle_id) AND (v.owner_id = ( SELECT auth.uid() )))))));

alter policy "vlead update by dealer" on public.vehicle_leads
  using ((EXISTS ( SELECT 1
   FROM vehicles v
  WHERE ((v.id = vehicle_leads.vehicle_id) AND (v.owner_id = ( SELECT auth.uid() ))))))
  with check ((EXISTS ( SELECT 1
   FROM vehicles v
  WHERE ((v.id = vehicle_leads.vehicle_id) AND (v.owner_id = ( SELECT auth.uid() ))))));

alter policy "own vsaves delete" on public.vehicle_saves
  using ((user_id = ( SELECT auth.uid() )));

alter policy "own vsaves insert" on public.vehicle_saves
  with check ((user_id = ( SELECT auth.uid() )));

alter policy "own vsaves read" on public.vehicle_saves
  using ((user_id = ( SELECT auth.uid() )));

alter policy "vtest cancel by visitor" on public.vehicle_tests
  using ((user_id = ( SELECT auth.uid() )))
  with check ((user_id = ( SELECT auth.uid() )));

alter policy "vtest read own or dealer" on public.vehicle_tests
  using (((user_id = ( SELECT auth.uid() )) OR (EXISTS ( SELECT 1
   FROM vehicles v
  WHERE ((v.id = vehicle_tests.vehicle_id) AND (v.owner_id = ( SELECT auth.uid() )))))));

alter policy "vtest update by dealer" on public.vehicle_tests
  using ((EXISTS ( SELECT 1
   FROM vehicles v
  WHERE ((v.id = vehicle_tests.vehicle_id) AND (v.owner_id = ( SELECT auth.uid() ))))))
  with check ((EXISTS ( SELECT 1
   FROM vehicles v
  WHERE ((v.id = vehicle_tests.vehicle_id) AND (v.owner_id = ( SELECT auth.uid() ))))));

alter policy "owner delete vehicles" on public.vehicles
  using ((owner_id = ( SELECT auth.uid() )));

alter policy "owner insert vehicles" on public.vehicles
  with check ((owner_id = ( SELECT auth.uid() )));

alter policy "owner update vehicles" on public.vehicles
  using ((owner_id = ( SELECT auth.uid() )))
  with check ((owner_id = ( SELECT auth.uid() )));

alter policy "public read published vehicles" on public.vehicles
  using (((status = ANY (ARRAY['published'::text, 'pending'::text, 'sold'::text])) OR (owner_id = ( SELECT auth.uid() ))));

-- ════════════════════════════════════════════════════════════════════════
-- Funciones nuestras con `search_path` fijo
-- ════════════════════════════════════════════════════════════════════════
-- Ninguna es SECURITY DEFINER, así que el riesgo real era bajo; aun así, un
-- disparador con el camino de búsqueda suelto es una puerta que no hace
-- falta dejar abierta. Comprobado que ninguna cambia de comportamiento:
-- events_near 3→3 · search_events 1→1 · search_cities 6→6 · nearest_city
-- «Hazleton, PA» → igual · huella de negocios idéntica · y los disparadores
-- corren sin error sobre un UPDATE real.
-- Se hace con un bucle y no con una lista fija: `_seed_user` solo existe en la
-- base de PRUEBAS, y una lista escrita a mano hacía FALLAR la migración entera
-- en producción («function does not exist»). Así la misma migración vale para
-- las dos bases y se puede repetir sin miedo — solo toca lo que encuentre suelto
-- y nunca lo que ya viene con una extensión.
do $bucle$
declare f record;
begin
  for f in
    select p.oid::regprocedure as firma
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.prokind = 'f'
       and not exists (select 1 from pg_depend d join pg_extension e on e.oid = d.refobjid
                        where d.objid = p.oid and d.deptype = 'e')
       and not exists (select 1 from unnest(coalesce(p.proconfig, '{}')) c where c like 'search_path=%')
  loop
    execute format('alter function %s set search_path = public, pg_temp', f.firma);
  end loop;
end $bucle$;

notify pgrst, 'reload schema';
