// Explicit request-budget sessions only. Legacy timed manifests retain their checks.
export const ownMode=mode=>['live-own-account-selected','offline-own-account-test'].includes(mode);
export const requestBudgetOwn=m=>m?.schema===2&&ownMode(m.mode)&&m.expiresAt===null&&m.maxUSD===0
 &&m.admission?.kind===(m.mode==='live-own-account-selected'?'own-account-explicit':'offline-own-account-test')&&m.admission.maxUSD===0;
export const ownModel=value=>typeof value==='string'&&/^[a-z0-9][a-z0-9._:-]{0,99}$/.test(value);
