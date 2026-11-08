// A distinct ordinary activation. Historical managed/evaluation contracts stay closed.
import {assert,exactKeys,canonical,time} from '../src/domain.ts';
import {address,digest} from './activity.ts';
import {isAbsolute} from 'node:path';
export const OWN_LIMITS=Object.freeze({tatumBatches:8,writes:7,reads:10,requests:192,pollsPerJob:8});
import {ownMode,ownModel} from './agent-own-policy.mjs';
export {ownMode} from './agent-own-policy.mjs';
export function validateOwnWritePolicy(p){
 exactKeys(p,['schema','kind','digests','maxNewWrites','submissionProofs']);
 assert(p.schema===1&&p.kind==='exact-missing-transaction-facts'&&Array.isArray(p.digests)
  &&p.digests.length>0&&p.digests.length<=OWN_LIMITS.writes&&new Set(p.digests).size===p.digests.length
  &&p.maxNewWrites===p.digests.length&&p.submissionProofs===true,'OWN_WRITE_POLICY');p.digests.forEach(digest);return p;
}
export function validateOwnContext(c){
 exactKeys(c,['schema','kind','identity','config','captureConsent','captureScope','limits','profileHash','expiresAt','credentialRoot','keyFile','retained','captureSet',...(Object.hasOwn(c,'writePolicy')?['writePolicy']:[]),...(c.schema===2?['clientModel']:[])]);
 assert([1,2].includes(c.schema)&&['own-account-explicit','offline-own-account-test'].includes(c.kind)
  &&typeof c.captureConsent==='boolean'&&['transaction-facts-only','verified-experience'].includes(c.captureScope)
  &&canonical(c.limits)===canonical(OWN_LIMITS)&&/^[a-f0-9]{64}$/.test(c.profileHash),'OWN_CONTEXT');
 assert(isAbsolute(c.credentialRoot)&&isAbsolute(c.keyFile),'OWN_CREDENTIAL_PATH');
 assert(c.captureSet===null||(Array.isArray(c.captureSet)&&c.captureSet.length===7&&new Set(c.captureSet).size===7),'OWN_CAPTURE_SET');
 c.captureSet?.forEach(digest);
 if(Object.hasOwn(c,'writePolicy')){validateOwnWritePolicy(c.writePolicy);assert(c.captureConsent&&c.captureScope==='transaction-facts-only'
  &&c.captureSet&&c.writePolicy.digests.every(d=>c.captureSet.includes(d)),'OWN_WRITE_POLICY');}
 exactKeys(c.identity,['owner','accountId','delegatePublicKeyHex','packageId','workspace']);
 assert([c.identity.owner,c.identity.accountId,c.identity.packageId].every(x=>address(x)===x)
  &&/^[a-f0-9]{64}$/.test(c.identity.delegatePublicKeyHex)&&/^agent-[a-f0-9-]{36}$/.test(c.identity.workspace),'OWN_IDENTITY');
 assert(c.config.network==='mainnet'&&c.config.packageId===c.identity.packageId&&c.config.suiTransport==='grpc'
  &&c.config.suiGrpcUrl==='https://mysten-rpc.mainnet.sui.io','OWN_DEPLOYMENT');
 if(c.schema===1)time(c.expiresAt);else assert(c.expiresAt===null&&ownModel(c.clientModel),'OWN_REQUEST_BUDGET_POLICY');return c;
}
export function validateOwnManifest(m,{live=false}={}){
 exactKeys(m,['schema','mode','runId','owner','accountId','delegatePublicKeyHex','packageId','workspace','datasetId','source','namespaces','maxUSD','expiresAt','admission']);
 assert([1,2].includes(m.schema)&&m.mode===(live?'live-own-account-selected':'offline-own-account-test')&&m.maxUSD===0
  &&m.source===(live?'tatum':'fixture')&&/^[a-f0-9-]{36}$/.test(m.runId)&&/^agent-[a-f0-9-]{36}$/.test(m.workspace),'OWN_MANIFEST');
 assert([m.owner,m.accountId,m.packageId].every(x=>address(x)===x)&&/^[a-f0-9]{64}$/.test(m.delegatePublicKeyHex)
  &&/^[a-f0-9]{64}$/.test(m.datasetId),'OWN_MANIFEST');
 exactKeys(m.namespaces,['rules','experience']);assert(m.namespaces.rules===m.workspace+'-rules'&&m.namespaces.experience===m.workspace+'-experience','OWN_NAMESPACES');
 exactKeys(m.admission,['kind','accountId','delegatePublicKeyHex','checkedAt','maxUSD','workspaceHash','policyHash','contextHash','profileHash','deploymentHash']);
 assert(m.admission.kind===(live?'own-account-explicit':'offline-own-account-test')&&m.admission.accountId===m.accountId
  &&m.admission.delegatePublicKeyHex===m.delegatePublicKeyHex&&m.admission.maxUSD===0
  &&['workspaceHash','policyHash','contextHash','profileHash','deploymentHash'].every(k=>/^[a-f0-9]{64}$/.test(m.admission[k])),'OWN_ADMISSION');
 if(m.schema===1)time(m.expiresAt);else assert(m.expiresAt===null,'OWN_REQUEST_BUDGET_POLICY');time(m.admission.checkedAt);return m;
}
