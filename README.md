# SmileSYNC frontend

React app for the SmileSYNC clinic system (doctor, consultant, assistant and patient views).
It talks to the Django API in `../SmileSYNC`.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
```

It talks to the hosted API at **https://kapilagrawal.pythonanywhere.com** (every route under `/api/`).
Tick "Demo mode" at the bottom of the login screen to use sample data in your browser instead,
which needs no backend.

| Role | Phone | Password |
| --- | --- | --- |
| Doctor | 9000000001 | doctor123 |
| Assistant | 9000000002 | assist123 |
| Consultant (demo only) | 9000000003 | consult123 |
| Patient | 9111111111 | code `123456` (demo) or the code shown on screen |

The login screen has a "Fill demo … details" button for each role.

## Backend

The base URL is `https://kapilagrawal.pythonanywhere.com`. It is set in two places:

- Dev: `vite.config.js` proxies `/api` to it (the backend has no CORS setup, so the browser talks to Vite).
- Build: `.env.production` sets `VITE_API_URL` to it.

The SmileSYNC Django project (`../SmileSYNC`) must be deployed there for the app to work:
`migrate`, then `seed_demo` if you want the sample logins. To use a local backend instead:

```bash
cd ../SmileSYNC && python manage.py runserver
VITE_BACKEND=http://localhost:8000 npm run dev
```

- A production build served from another domain needs `django-cors-headers` on the backend.
- Patient login shows the one-time code on screen only while the backend runs with `DEBUG=1`.

## Screens by role

| Screen | Doctor | Consultant | Assistant | Patient |
| --- | :-: | :-: | :-: | :-: |
| Today (appointments, chairs, summary tiles) | yes | yes | yes | My health |
| Patients (register, records, treatments, images, billing with advance payments) | yes | yes | yes | – |
| Private notes | yes | – | – | – |
| Appointments | yes | yes | yes | on My health |
| Hygiene (4 photos after each patient, daily rounds, review) | review | – | upload | – |
| Inventory (stock in, count, usage rules) | full | view | view, stock in | – |
| Messages (WhatsApp offers, log) | yes | – | – | – |
| Clinic (profile, staff, chairs, documents, feedback) | full | profile, feedback | profile | profile, rate |

The app hides what a role cannot use, and the API enforces it as well.

## Sign-up needs one backend route

The brief asks for sign-up with a role choice, but the backend has no public sign-up endpoint
(staff are created by the doctor, patients by the clinic). The sign-up form calls:

```
POST /api/auth/register/
{ role, name, phone,
  password,                              // doctor, consultant, assistant
  clinic_name, city,                     // doctor: creates the clinic
  clinic_code,                           // everyone else: the clinic to join
  registration_number, designation, speciality,   // doctor, consultant
  consent_data, consent_whatsapp }       // patient
-> staff:   { token, user }
-> patient: 200 (the app then asks for the WhatsApp code and calls /auth/otp/verify/)
```

Demo mode implements this so you can try the whole flow. Against the current backend the form
shows "Sign-up is not available on this server yet". Everything else uses routes that already exist.

## Billing and advance payments

The patient's Billing tab shows billed, paid, due and the advance available. "Take advance" records money paid before
billing (with the date it was received, so an earlier payment can be entered). A new invoice offers to use the advance,
a due invoice has a "Use advance" button, and "Paid now" on a new invoice records money the patient already paid (for example
Braces 34000, paid 20000, due 14000). Every invoice shows Total, Paid and Due with a progress bar. The doctor can refund what is left or delete a wrong entry. This needs the
backend routes under `/api/advances/`, `/api/invoices/{id}/apply-advance/` and `/api/patients/{id}/billing/`.
Deploy and migrate the backend first. Demo mode implements the same rules.

## Project layout

```
src/api/client.js     every network call, pagination, error text, authenticated file download
src/api/mock.js       the in-browser demo backend (same routes and rules as the API)
src/auth/             login state and roles
src/components/       layout, shared UI, visit list
src/pages/            one file per screen
src/styles.css        the whole design (navy, teal, amber)
```

## Notes

- X-rays, photos and documents are served by authenticated endpoints, so images are downloaded
  with the token and shown from a temporary blob URL.
- Hygiene photos use the camera on phones (`capture`), but a browser cannot force camera-only.
  The server stamps the time and rejects a re-submitted file; true camera-only needs the mobile app.
- Not built yet (matches the brief's later phases and "left for later" list): camera/RVG connector,
  offline sync, image compression, Hindi and regional-language UI, daily-tips subscription toggle.
