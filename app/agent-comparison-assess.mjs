// Mechanical implementation of the predeclared small comparison criteria.
export function assessFirstLookup(trace,schema){
 const lookup=trace.find(t=>t.kind==='tool'&&t.tool==='find_wallet_activity');
 if(!lookup)return {observed:false,valid:null};
 const value=lookup.arguments?.limit,bounds=schema.properties.limit;
 const valid=value===undefined||(Number.isInteger(value)&&value>=bounds.minimum&&value<=bounds.maximum);
 return {observed:true,limit:value??null,omitted:value===undefined,valid,status:lookup.status};
}
export function assessMemoryPair(control,treatment){
 if(!control.observed||!treatment.observed)return 'INCONCLUSIVE_NO_LOOKUP';
 if(!control.valid&&treatment.valid)return 'NARROW_FIRST_CHOICE_DIFFERENCE';
 if(control.valid&&treatment.valid)return 'NO_OBSERVED_IMPROVEMENT_BOTH_VALID';
 return 'NO_OBSERVED_BENEFIT';
}
export function artifactReferenceMatches(artifact,message){
 return typeof message==='string'&&Boolean(artifact?.path&&artifact?.sha256)
  &&(message.includes(artifact.path)||(typeof artifact.uri==='string'&&message.includes(artifact.uri)))&&message.includes(artifact.sha256);
}
