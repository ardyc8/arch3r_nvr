const curSettings = { license: "old_license", email: "old_email", p2p_relay: "old_p2p" };
const reqBody = { p2p_relay: "new_p2p" };
const newSettings = { ...curSettings, ...reqBody };
console.log(newSettings);
