import test from 'node:test';
import assert from 'node:assert/strict';
import {createContentLoader} from './content-source-loader.mjs';
const {restoredSidebar,showPlusOffer,phoneNavigationLayout}=createContentLoader()('src/lib/navigation-layout.ts');
test('phone portrait/landscape is separate from tablet, including tablet keyboard resize',()=>{
  for(const [w,h,coarse,sw,sh,phone]of [[320,700,true,320,700,true],[390,844,true,390,844,true],[844,390,true,844,390,true],[932,430,true,932,430,true],[820,1180,true,820,1180,false],[1180,820,true,1180,820,false],[820,360,true,820,1180,false],[1024,400,true,768,1024,false],[844,390,false,1920,1080,false],[1440,900,false,1920,1080,false]])assert.equal(phoneNavigationLayout(w,h,coarse,sw,sh),phone);
});
test('phone never renders a Plus dock, for both premium and free access',()=>{
  for(const premium of [false,true])for(const view of ['home','catalog','tasks','theory','premium','profile','trainer'])assert.equal(showPlusOffer(premium,view,false,false,false,true),false);
});
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
