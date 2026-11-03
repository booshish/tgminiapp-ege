import test from 'node:test';
import assert from 'node:assert/strict';
import {createContentLoader} from './content-source-loader.mjs';
const {restoredSidebar,showPlusOffer}=createContentLoader()('src/lib/navigation-layout.ts');
test('binary sidebar restores legacy compact as labelled expanded, preserving hidden',()=>{
  for(const raw of [null,'compact','expanded','unknown'])assert.equal(restoredSidebar(raw),'expanded');
  assert.equal(restoredSidebar('hidden'),'hidden');
});
test('a premium entitlement hides advertising on every route; paywalls and focus never compete',()=>{
  for(const view of ['home','catalog','tasks','theory','favorites','mistakes','trainer','progress','review','profile','premium']){
    assert.equal(showPlusOffer(true,view,false,false,false),false);
    assert.equal(showPlusOffer(false,view,true,false,false),false);
    assert.equal(showPlusOffer(false,view,false,true,false),false);
    assert.equal(showPlusOffer(false,view,false,false,true),false);
  }
  for(const view of ['trainer','progress','review','premium','profile'])assert.equal(showPlusOffer(false,view,false,false,false),false);
  for(const view of ['home','catalog','tasks','theory','favorites','mistakes'])assert.equal(showPlusOffer(false,view,false,false,false),true);
});
