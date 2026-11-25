// Who can do what inside a clinic. The server enforces all of this too; these only decide what to show.
//
//   clinic admin  runs the clinic: team, profile, billing corrections, stock, documents. Can do everything a doctor can.
//   doctor        treats patients, reads private notes, reviews hygiene photos
//   consultant    treats patients
//   assistant     front desk, images, hygiene photos, stock in

export const isAdmin = (user) => user?.role === "clinic_admin";
export const isClinical = (user) => ["clinic_admin", "doctor", "consultant"].includes(user?.role);
export const canReview = (user) => ["clinic_admin", "doctor"].includes(user?.role); // private notes, hygiene review
export const isPatient = (user) => user?.role === "patient";
