-- =====================================================================
-- Divisual — Datos de prueba
-- Rellena las tablas de sql/2026-07-09_schema_completo.sql +
-- sql/2026-07-13_add_missing_fields.sql con datos de ejemplo que tocan
-- todos los campos (incluidos los nuevos: apellidos/móvil de contacto,
-- vínculo contacto-hotel, ficha comercial de hotel, y los datos legales
-- de negocio) y ponen a prueba las funciones ya existentes (vencimientos,
-- negocios estancados, forecast, semáforo de riesgo, recurrencia,
-- duplicados, Mi día, notificaciones...).
--
-- Requiere haber ejecutado antes sql/2026-07-13_add_missing_fields.sql
-- (crea last_name, mobile_phone, hotels_contacts, jaippy_id, address, los
-- campos comerciales de hotel y los datos legales de negocio; quita las
-- columnas de décimas que ya no existen en el modelo).
--
-- Ejecútalo DESPUÉS de sql/2026-07-09_schema_completo.sql, de una vez y
-- de arriba a abajo (los bloques de más abajo buscan los ids de los de
-- más arriba por nombre/correo, así que el orden importa).
--
-- Incluye a propósito:
--   - Un contacto y una empresa duplicados (para "Detectar duplicados").
--   - Un negocio que cierra pronto, otro estancado, uno con servicio
--     activo este mes y otro que empieza dentro de dos meses.
--   - Un hotel con el plan por vencer y desviación >15% (dispara el
--     aviso de desviación al entrar en la app).
--   - Hoteles con 0, 1 y 2 tickets abiertos (para el semáforo de riesgo).
--   - Un evento recurrente semanal y una tarea recurrente mensual.
--   - Una persona con el correo mbandera@uxhoteles.com, para que "Mi
--     día" y las notificaciones tengan algo que mostrarte a ti.
-- =====================================================================


-- ---------------------------------------------------------------------
-- Tablas base
-- ---------------------------------------------------------------------

insert into personnel (name, email, phone) values
('Miguel Bandera', 'mbandera@uxhoteles.com', '+34600111222'),
('Laura Gómez', 'laura.gomez@uxhoteles.com', '+34600111333'),
('Javier Ruiz', 'javier.ruiz@uxhoteles.com', '+34600111444'),
('Ana Torres', 'ana.torres@uxhoteles.com', '+34600111555'),
('Carlos Molina', 'carlos.molina@uxhoteles.com', '+34600111666');

insert into companies (name, phone, client, category) values
('Cadena Hotelera Sol', '+34911000001', true, 'Cadena hotelera'),
('Agencia ViajaMás', '+34911000002', false, 'Agencia de viajes'),
('Grupo Costa Azul', '+34911000003', true, 'Cadena hotelera'),
('Consultora RevPlus', '+34911000004', false, 'Consultoría'),
('Cadena Hotelera Sol', '+34911000005', true, 'Cadena hotelera'); -- duplicada a propósito

insert into contacts (name, last_name, phone, mobile_phone, email, lead_status) values
('Marta Fernández', 'Fernández', '+34622000001', '+34611000001', 'marta.fernandez@solhoteles.com', 'Cliente'),
('Pedro Sánchez', 'Sánchez', '+34622000002', '+34611000002', 'pedro.sanchez@viajamas.com', 'Oportunidad'),
('Lucía Romero', 'Romero', '+34622000003', '+34611000003', 'lucia.romero@costaazul.com', 'Cliente'),
('Diego Navarro', 'Navarro', '+34622000004', null, 'diego.navarro@revplus.com', 'Lead'),
('Marta Fernandez', 'Fernandez', '+34622000006', '+34611000001', 'marta.fernandez@solhoteles.com', 'Cliente'); -- duplicada a propósito (mismo correo)

insert into tags (name) values ('VIP'), ('Renovación'), ('Cadena'), ('Nuevo cliente');

insert into billing_models (name) values ('Por décimas'), ('Fee fijo mensual'), ('Comisión sobre ingresos');

insert into hotels (
  jaippy_id, name, has_plan, tau, current_ij, objective, deviation_days, deviation_pct,
  plan_end_date, updated_at, income_current_month, income_next_month,
  num_rooms, adr, booking_url, stars, category, is_chain, pms, city, postal_code, address, description
) values
(101, 'Hotel Marbella Playa',   true,  82.5, 950000,  1000000, 12,   5.2,
  current_date + 45,  now(), 18500, 21000,
  120, 145.50, 'https://www.booking.com/hotel/es/marbella-playa.html', 4, 'Hotel', false, 'Opera Cloud', 'Marbella', '29600', 'Paseo Marítimo 24', 'Hotel frente al mar en pleno centro de Marbella, con vistas directas a la playa.'),
(102, 'Hotel Sevilla Centro',   true,  75.0, 700000,  900000,  40,  -18.5,
  current_date + 20,  now(), 9800, 8200,
  85,  98.00,  'https://www.booking.com/hotel/es/sevilla-centro.html', 3, 'Hotel', false, 'Prestige', 'Sevilla', '41001', 'Calle Sierpes 10', 'Hotel boutique en pleno casco histórico de Sevilla.'), -- vence pronto + desviación >15%
(103, 'Hotel Costa Blanca Sur', true,  90.2, 1200000, 1150000, -5,   4.3,
  current_date + 200, now(), 26000, 27500,
  200, 130.00, 'https://www.booking.com/hotel/es/costa-blanca-sur.html', 4, 'Hotel', true,  'Opera Cloud', 'Benidorm', '03501', 'Avenida del Mediterráneo 55', 'Gran hotel vacacional con acceso directo a la playa.'),
(104, 'Hotel Bilbao Deusto',    false, 60.0, null,    null,    null, null,
  null,               now(), null, null,
  50,  null,   null, null, 'Apartamento', false, null, 'Bilbao', '48007', 'Calle Deusto 3', null),
(105, 'Hotel Valencia Puerto',  true,  68.4, 500000,  650000,  160, -25.0,
  current_date + 10,  now(), 7400, 9100,
  95,  110.25, 'https://www.booking.com/hotel/es/valencia-puerto.html', 3, 'Hotel', false, 'Prestige', 'Valencia', '46024', 'Muelle de la Aduana 2', 'Hotel de negocios cerca del puerto y la Ciudad de las Artes.'); -- desviación >150 días + vence pronto

insert into stories (name) values ('Importación de hoteles'), ('Rediseño del Panel'), ('Integración de calendario');

insert into sprints (name, start_date, end_date, active) values
('Sprint 14', current_date - 7, current_date + 7, true),
('Sprint 13', current_date - 21, current_date - 8, false);

insert into labels (name, color) values
('Urgente', '#e34948'), ('Mejora', '#1baf7a'), ('Bug crítico', '#eb6834'), ('Documentación', '#4a3aa7');

insert into events (title, description, category, start_date, end_date, recurrence, recurrence_day) values
('Despliegue a producción',          'Release semanal',        'Despliegue',      current_date + 2, null, null, null),
('Reunión semanal de equipo',        'Sync semanal',           'Reunión',         current_date,     null, 'weekly', 5), -- todos los viernes
('Vacaciones Laura',                 'Vacaciones de verano',   'Vacaciones',      current_date + 10, current_date + 20, null, null),
('Teletrabajo Javier',               null,                     'Teletrabajo',     current_date + 1, null, null, null),
('Informe mensual de cierre',        'Cierre contable',        'Reunión',         current_date,     null, 'monthly', 1), -- el día 1 de cada mes
('Formación en Revenue Management',  'Sesión interna',         'Formación',       current_date + 5, null, null, null),
('Visita Hotel Marbella Playa',      'Visita comercial',       'Visita a hotel',  current_date + 3, null, null, null);


-- ---------------------------------------------------------------------
-- Tablas de relación (buscan los ids de arriba por nombre/correo)
-- ---------------------------------------------------------------------

insert into contacts_companies (contact_id, company_id, role) values
((select id from contacts where email = 'marta.fernandez@solhoteles.com' limit 1), (select id from companies where name = 'Cadena Hotelera Sol' limit 1), 'Directora Comercial'),
((select id from contacts where email = 'pedro.sanchez@viajamas.com' limit 1), (select id from companies where name = 'Agencia ViajaMás' limit 1), 'Gestor de cuentas'),
((select id from contacts where email = 'lucia.romero@costaazul.com' limit 1), (select id from companies where name = 'Grupo Costa Azul' limit 1), 'Revenue Manager');

insert into contacts_historial (contact_id, note) values
((select id from contacts where email = 'marta.fernandez@solhoteles.com' limit 1), 'Contacto creado'),
((select id from contacts where email = 'pedro.sanchez@viajamas.com' limit 1), 'Llamada de seguimiento, interesado en ampliar contrato');

insert into personnel_historial (personnel_id, note) values
((select id from personnel where email = 'mbandera@uxhoteles.com'), 'Alta en el equipo');

insert into tags_contacts (contact_id, tags) values
((select id from contacts where email = 'marta.fernandez@solhoteles.com' limit 1), (select id from tags where name = 'VIP')),
((select id from contacts where email = 'lucia.romero@costaazul.com' limit 1), (select id from tags where name = 'Cadena'));

insert into hotels_personnel (id_hotel, id_personnel, role, area) values
((select id from hotels where name = 'Hotel Marbella Playa'), (select id from personnel where email = 'laura.gomez@uxhoteles.com'), 'Revenue Manager', 'Costa del Sol'),
((select id from hotels where name = 'Hotel Sevilla Centro'), (select id from personnel where email = 'javier.ruiz@uxhoteles.com'), 'Account Manager', 'Andalucía'),
((select id from hotels where name = 'Hotel Valencia Puerto'), (select id from personnel where email = 'ana.torres@uxhoteles.com'), 'Revenue Manager', 'Levante');

insert into hotels_contacts (contact_id, hotel_id) values
((select id from contacts where email = 'marta.fernandez@solhoteles.com' limit 1), (select id from hotels where name = 'Hotel Marbella Playa')),
((select id from contacts where email = 'pedro.sanchez@viajamas.com' limit 1), (select id from hotels where name = 'Hotel Sevilla Centro'));

insert into events_personnel (event_id, personnel_id) values
((select id from events where title = 'Reunión semanal de equipo'), (select id from personnel where email = 'mbandera@uxhoteles.com')),
((select id from events where title = 'Reunión semanal de equipo'), (select id from personnel where email = 'laura.gomez@uxhoteles.com')),
((select id from events where title = 'Vacaciones Laura'), (select id from personnel where email = 'laura.gomez@uxhoteles.com'));


-- ---------------------------------------------------------------------
-- Negocios y su hotel/contacto vinculado
-- ---------------------------------------------------------------------

insert into deals (
  name, status, closing_date, value, type_of_charge, start_date, end_date, contact_id, billing_model,
  status_changed_at, closing_date_changed_at, closing_date_prev,
  legal_company_name, legal_business_name, registered_address, tax_id, legal_rep_name, legal_rep_id,
  contract_signed, monthly_fee, billing_contact_name
) values
('Renovación Hotel Marbella Playa', 'Negociación', current_date + 8, 45000, 'Anual', null, null,
  (select id from contacts where email = 'marta.fernandez@solhoteles.com' limit 1), (select id from billing_models where name = 'Por décimas'),
  now() - interval '3 days', now() - interval '3 days', current_date + 20,
  'Sol Hoteles Costa del Sol S.L.', 'Sol Hoteles Costa del Sol Sociedad Limitada', 'Paseo Marítimo 24, 29600 Marbella, Málaga', 'B29123456',
  'Marta Fernández Gil', '12345678A', true, 3750, 'Administración Sol Hoteles'), -- vence pronto + cambio de fecha reciente
('Seguimiento Hotel Sevilla Centro', 'Contactado', current_date + 90, 30000, 'Mensual', null, null,
  (select id from contacts where email = 'pedro.sanchez@viajamas.com' limit 1), (select id from billing_models where name = 'Fee fijo mensual'),
  now() - interval '25 days', null, null,
  null, null, null, null, null, null, false, null, null), -- estancado (>14 días sin moverse de etapa)
('Nuevo contrato Hotel Costa Blanca Sur', 'Prospecto', current_date + 40, 20000, 'Anual', null, null,
  (select id from contacts where email = 'lucia.romero@costaazul.com' limit 1), (select id from billing_models where name = 'Comisión sobre ingresos'),
  now() - interval '2 days', null, null,
  null, null, null, null, null, null, false, null, null),
('Contrato de servicio Hotel Costa Blanca Sur', 'Ganado', current_date - 60, 60000, 'Anual', current_date - 30, current_date + 335,
  (select id from contacts where email = 'lucia.romero@costaazul.com' limit 1), (select id from billing_models where name = 'Comisión sobre ingresos'),
  now() - interval '60 days', null, null,
  'Grupo Costa Azul S.A.', 'Grupo Costa Azul Sociedad Anónima', 'Avenida del Mediterráneo 55, 03501 Benidorm, Alicante', 'A03987654',
  'Lucía Romero Vidal', '87654321B', true, 5000, 'Facturación Grupo Costa Azul'), -- ingresos "mes actual" (servicio activo)
('Ampliación Hotel Valencia Puerto', 'Ganado', current_date - 10, 25000, 'Anual',
  (date_trunc('month', current_date) + interval '2 months')::date, (date_trunc('month', current_date) + interval '14 months')::date,
  (select id from contacts where email = 'diego.navarro@revplus.com' limit 1), (select id from billing_models where name = 'Por décimas'),
  now() - interval '10 days', null, null,
  null, null, null, null, null, null, false, null, null), -- ingresos "a futuro" (empieza en 2 meses)
('Oportunidad Hotel Bilbao Deusto', 'Perdido', current_date - 5, 15000, 'Mensual', null, null, null, null,
  now() - interval '5 days', null, null,
  null, null, null, null, null, null, false, null, null);

insert into deals_hotels (deal_id, hotel_id) values
((select id from deals where name = 'Renovación Hotel Marbella Playa'), (select id from hotels where name = 'Hotel Marbella Playa')),
((select id from deals where name = 'Seguimiento Hotel Sevilla Centro'), (select id from hotels where name = 'Hotel Sevilla Centro')),
((select id from deals where name = 'Nuevo contrato Hotel Costa Blanca Sur'), (select id from hotels where name = 'Hotel Costa Blanca Sur')),
((select id from deals where name = 'Contrato de servicio Hotel Costa Blanca Sur'), (select id from hotels where name = 'Hotel Costa Blanca Sur')),
((select id from deals where name = 'Ampliación Hotel Valencia Puerto'), (select id from hotels where name = 'Hotel Valencia Puerto'));


-- ---------------------------------------------------------------------
-- Tickets (Customer Success) — 2 abiertos en el mismo hotel (riesgo
-- alto), 1 en otro (riesgo medio) y uno ya cerrado (riesgo bajo)
-- ---------------------------------------------------------------------

insert into tickets (title, status, plan_end_date, company_id, owner_id, hotel_id) values
('Onboarding Hotel Marbella Playa', 'Seguimiento activo', current_date + 40,
  (select id from companies where name = 'Cadena Hotelera Sol' limit 1), (select id from personnel where email = 'laura.gomez@uxhoteles.com'), (select id from hotels where name = 'Hotel Marbella Playa')),
('Revisión de década Hotel Marbella Playa', 'Consolidación', current_date + 25,
  (select id from companies where name = 'Cadena Hotelera Sol' limit 1), (select id from personnel where email = 'laura.gomez@uxhoteles.com'), (select id from hotels where name = 'Hotel Marbella Playa')),
('Seguimiento Hotel Sevilla Centro', 'Por iniciar', current_date + 15,
  (select id from companies where name = 'Agencia ViajaMás' limit 1), (select id from personnel where email = 'javier.ruiz@uxhoteles.com'), (select id from hotels where name = 'Hotel Sevilla Centro')),
('Cierre de ciclo Hotel Costa Blanca Sur', 'Cierre de ciclo', current_date - 10,
  (select id from companies where name = 'Grupo Costa Azul' limit 1), (select id from personnel where email = 'ana.torres@uxhoteles.com'), (select id from hotels where name = 'Hotel Costa Blanca Sur')),
('Décima alcanzada Hotel Valencia Puerto', 'Décima alcanzada', current_date + 5,
  null, (select id from personnel where email = 'carlos.molina@uxhoteles.com'), (select id from hotels where name = 'Hotel Valencia Puerto'));

insert into tickets_contacts (ticket_id, contact_id) values
((select id from tickets where title = 'Onboarding Hotel Marbella Playa'), (select id from contacts where email = 'marta.fernandez@solhoteles.com' limit 1)),
((select id from tickets where title = 'Seguimiento Hotel Sevilla Centro'), (select id from contacts where email = 'pedro.sanchez@viajamas.com' limit 1));


-- ---------------------------------------------------------------------
-- Tablero: historias, sprints, tareas (una recurrente), etiquetas
-- ---------------------------------------------------------------------

insert into tasks (title, description, type, status, priority, due_date, story_id, sprint_id, recurrence, recurrence_day) values
('Revisar import de hoteles', 'Comprobar que el script de Jaippy corre bien', 'Tarea', 'En curso', 'Alta', current_date + 3,
  (select id from stories where name = 'Importación de hoteles'), (select id from sprints where name = 'Sprint 14'), null, null),
('Bug en gráfico del Panel', 'El tooltip no se cierra en móvil', 'Bug', 'Por hacer', 'Alta', current_date + 1,
  (select id from stories where name = 'Rediseño del Panel'), (select id from sprints where name = 'Sprint 14'), null, null),
('Backup semanal de la base de datos', 'Comprobar que el backup automático corrió', 'Tarea', 'Por hacer', 'Media', current_date,
  null, null, 'weekly', 1), -- recurrente, todos los lunes
('Informe mensual de décimas', 'Mandar el resumen a dirección', 'Tarea', 'Por hacer', 'Media', (date_trunc('month', current_date) + interval '1 month')::date,
  null, null, 'monthly', 1), -- recurrente, el día 1 de cada mes
('Documentar API de recurrencia', null, 'Tarea', 'Por hacer', 'Baja', null,
  (select id from stories where name = 'Integración de calendario'), null, null, null),
('Revisar rendimiento de la consulta de Cartera', 'Está tardando mucho con muchos hoteles', 'Bug', 'Prueba en dev', 'Media', current_date + 6,
  null, (select id from sprints where name = 'Sprint 13'), null, null);

insert into tasks_personnel (task_id, personnel_id) values
((select id from tasks where title = 'Revisar import de hoteles'), (select id from personnel where email = 'mbandera@uxhoteles.com')),
((select id from tasks where title = 'Bug en gráfico del Panel'), (select id from personnel where email = 'mbandera@uxhoteles.com')),
((select id from tasks where title = 'Backup semanal de la base de datos'), (select id from personnel where email = 'javier.ruiz@uxhoteles.com')),
((select id from tasks where title = 'Documentar API de recurrencia'), (select id from personnel where email = 'laura.gomez@uxhoteles.com'));

insert into task_comments (task_id, author_email, comment) values
((select id from tasks where title = 'Bug en gráfico del Panel'), 'mbandera@uxhoteles.com', 'Reproducido en iPhone Safari, miro el fix esta semana.'),
((select id from tasks where title = 'Revisar import de hoteles'), 'laura.gomez@uxhoteles.com', 'El último import trajo 2 hoteles duplicados, revisar nombres.');

insert into task_subitems (task_id, title, done) values
((select id from tasks where title = 'Revisar import de hoteles'), 'Comprobar hoteles duplicados', true),
((select id from tasks where title = 'Revisar import de hoteles'), 'Validar décimas contra Jaippy', false),
((select id from tasks where title = 'Bug en gráfico del Panel'), 'Reproducir en Chrome', true),
((select id from tasks where title = 'Bug en gráfico del Panel'), 'Aplicar fix y desplegar', false);

insert into task_attachments (task_id, label, url) values
((select id from tasks where title = 'Revisar import de hoteles'), 'Captura del error', 'https://example.com/captura-import.png'),
((select id from tasks where title = 'Bug en gráfico del Panel'), 'Grabación del bug', 'https://example.com/grabacion-bug.mp4');

insert into tasks_labels (task_id, label_id) values
((select id from tasks where title = 'Bug en gráfico del Panel'), (select id from labels where name = 'Bug crítico')),
((select id from tasks where title = 'Bug en gráfico del Panel'), (select id from labels where name = 'Urgente')),
((select id from tasks where title = 'Documentar API de recurrencia'), (select id from labels where name = 'Documentación'));


-- ---------------------------------------------------------------------
-- Chat interno
-- ---------------------------------------------------------------------

insert into messages (sender_email, recipient_email, body, type, task_title, task_description, task_type, task_response, task_id) values
('laura.gomez@uxhoteles.com', 'mbandera@uxhoteles.com', '¿Puedes revisar el import de hoteles cuando tengas un rato?', 'text', null, null, null, null, null),
('mbandera@uxhoteles.com', 'laura.gomez@uxhoteles.com', 'Sí, lo miro esta tarde', 'text', null, null, null, null, null),
('javier.ruiz@uxhoteles.com', 'mbandera@uxhoteles.com', null, 'task_request', 'Actualizar precios Hotel Sevilla Centro', 'Los precios de temporada alta están desactualizados', 'Tarea', 'pending', null);
