// for node >=10


const __ejwt = {
  conf:{},
  req:{},
  res:{},
  token : null,
  data : {},
  // decoded_token:{},  

  reqToken: ()=>{
    // console.log( __ejwt.req)
      var useragent
      if(typeof __ejwt.req.headers =='object')
         useragent= __ejwt.req.headers['user-agent']
      else if(typeof __ejwt.req.headers =='function')
         useragent= __ejwt.req.headers('user-agent')

      var token,csrf_token;
      if(useragent.match(/android|iphone|ipad|ipod|windows phone/i)){  // request from mobile app & not mobile browser
          return {
              token: __ejwt.req.body.token || null ,
              csrf_token: __ejwt.req.body.csrf_token || null
          }
      }
      else{
          return{
            token: __ejwt.req.cookies.token || null ,
            csrf_token: __ejwt.req.cookies.csrf_token || null
          }
      }
  },
  do: async (action,payload,expire=__ejwt.conf.expire)=>{
      try {
            var tid,token;
            payload = payload || {}
            
            token = await __ejwt.getFull() || null
      
            tid=(token && token.tokenId)?token.tokenId:uniqid()
            if(action=='unset') expire=1

            payload.tokenId=tid
            var csrf_token=uniqid()
            payload.csrf_token=csrf_token

      
            if(!token && expire || (token &&  !payload.tokenExpire)) {
              payload.tokenExpire=Date.now()+expire*1000
            }

            if(__ejwt.conf.use_redis){
                if(action=='unset')
                    __redis.del(tid)
                else{
                  if(expire) 
                      await __redis.set(tid,JSON.stringify(payload),'EX',expire)
                  else
                      await __redis.set(tid,JSON.stringify(payload))
                  token =  jwtsimple.encode({tokenId:tid}, __ejwt.conf.secret);
                }
            }
            else{
                token =  jwtsimple.encode(payload, __ejwt.conf.secret);
            }
            if(action=='unset'){
              
                // __ejwt.res.clearCookie('token')
                // __ejwt.res.clearCookie('csrf_token')
                 __ejwt.res.setHeader('Set-Cookie',[`token=;httpOnly;path=/`,`csrf_token=;httpOnly;path=/`])
                __ejwt.req.cookies = ''
                return null
            }
            else{
                __ejwt.res.setHeader('Set-Cookie',[`token=${token};httpOnly;path=/`,`csrf_token=${csrf_token};httpOnly;path=/`])
            }

            __ejwt.token=token
            __ejwt.data=payload


            // for(item of Object.keys(payload)){
            //   if(/_expire$/.test(item)){
            //     delete payload[item]
            //   }
            // }

            delete payload.captcha
            delete payload.tokenId
            delete payload.csrf_token
            delete payload.tokenExpire

            return payload

      }catch(err){
        // return null
        return {err:err.message}
      }
},

set: async (payload,expire=__ejwt.conf.expire)=>{
    return await __ejwt.do('set',payload,expire)
    
},

unset: async ()=>{
    await  __ejwt.do('unset',null)
},

getFull:async()=>{ 
  try{

      var reqToken=__ejwt.reqToken()
    
      if(!reqToken.token) 
          return null
      token=reqToken.token
      if(!token) return null
      var decoded = jwtsimple.decode(token, __ejwt.conf.secret)
      for(var item of Object.keys(decoded)){
        if(/_expire$/.test(item) && Date.now()>decoded[item]){
           unsetObjectKey(decoded,item.replace("_expire",""))
           delete decoded[item]
        }
      }
      var ret=null
      if(__ejwt.conf.use_redis){
        if(decoded.tokenId) 
          ret = await __redis.get(decoded.tokenId) 
          ret=JSON.parse(ret)
      }
      else{
          if ( Date.now()>decoded.tokenExpire){
              ret=null
           }
          else{
              __ejwt.data = decoded  //data include  tokenId,csrf_token,tokenExpire,captcah
              ret = decoded
          }
      }
      return ret && JSON.stringify(ret)!='{}' ? ret:null

  }catch(err){
    return null
    // return {err:err.message}
  }
},
get:async()=>{
  var ret = await __ejwt.getFull()
  return __ejwt.purify(ret)
},

purify:(obj)=>{
  if(obj==null || typeof obj!=="object" )
    return null

  for(item of Object.keys(obj)){
    if(/_expire$/.test(item)){
      delete obj[item]
    }
  }
  delete obj.captcha
  delete obj.tokenId
  delete obj.csrf_token
  delete obj.tokenExpire

  return obj

},

getkey: async (key)=> {
  let data = await __ejwt.getFull()   
  if(data && data[key+'_expire'] && Date.now()>data[key+'_expire']){
      delete data[key]
      delete data[key+'_expire']
      __ejwt.set(data)
  }
  return (data  &&  data[key])?data[key]:null
},

setkey: async (key,val,expire = null)=> {
  try{
      var data = await __ejwt.getFull()
      var pl=(!data)?{}:data
      setObjectKey(pl,key,val)
      if(expire) pl[key+'_expire']=Date.now()+expire*1000
      return __ejwt.purify(await  __ejwt.set(pl))
      // return  await __ejwt.get()
   }catch(err){
     return {err:err.message}
   }
},

unsetkey: async (key)=> {
   var data = await __ejwt.getFull()
    try{
        if(data){
            unsetObjectKey(data,key)
            if(data[key+'_expire'])
              delete data[key+'_expire']
            return __ejwt.purify(await __ejwt.set(data))
        }
     }catch(err){
       return {err:err.message}
     }
},

 csrfgen: async ()=> {
  try{
    //  await __ejwt.set(__ejwt.getFull())
     await __ejwt.setkey('csrf_token',uniqid())
     
     return {
        token: __ejwt.token,
        csrf_token: __ejwt.data.csrf_token
     }
   }catch(err){
     return {err:err.message}
   }

},

csrfchk: async ()=> {
    try{
        var __ejwt_csrf_token = await  __ejwt.getkey('csrf_token'),
            reqToken=__ejwt.reqToken(),
            reqToken_csrf = reqToken.csrf_token
        if(!__ejwt_csrf_token || __ejwt_csrf_token!=reqToken_csrf)
            return {err:'invalid csrf token :('}
        else
            return {succ:'csurf token is valid :)'}
    }catch(err){
        return {err:err.message}
    } 
},

 captcha_gen: async (type='text',expire=0,captcha_name='captcha')=> {  //type: text or math
    try{
        var svgCaptcha = require('svg-captcha'),
           captcha
        if(type=='text')
            captcha = svgCaptcha.create();
        else if(type='math')
           captcha = svgCaptcha.createMathExpr({mathMin:1,mathMax:20,mathOperator:'+'});
      
        await  __ejwt.setkey(captcha_name,captcha.text,expire)
        return captcha.data
    }catch(err){
        return {err:err.message}
    }
 },

 captcha_chk: async (captcha_name='captcha')=> {
    try{
      input=__ejwt.req.body[captcha_name]
   
      var __ejwt_captcha = await  __ejwt.getkey(captcha_name)
      if(__ejwt_captcha && input==__ejwt_captcha)
          return {succ:'valid captch :)'}
      else
          return {err:'invalid captcha :('}
   }catch(err){
      return {err:err.message}
   }
 }

}

function def(variable,defalt){
return typeof variable !== 'undefined'?variable:defalt
}


const jwtsimple  = require('jwt-simple');
const uniqid     = require('uniqid');

module.exports = function(options){
__ejwt.conf={
      use_redis    : def(options.use_redis    , false         ),       //true : use redis , false : use only jwt for store payload
      expire       : def(options.expire         , 3600          ),       // in seconds
      secret       : def(options.secret        , `$eCr3T`     ),
      sec_cookie   : def(options.sec_cookie    , false        ),       // if true only pass on https . on develop set it to false
      redis_host   : def(options.redis_host   , 'localhost'   ),
      redis_port   : def(options.redis_port   , 6379          ),
      redis_pass   : def(options.redis_pass   , ''            )
}


 if(__ejwt.conf.use_redis){
      var REDIS   = require("async-redis");
      __redis   = REDIS.createClient(__ejwt.conf.redis_port,__ejwt.conf.redis_host)
      if(__ejwt.conf.redis_pass)
        __redis.auth(__ejwt.conf.redis_pass)
    
}
return __ejwt
}


//helper funcs

function setObjectKey(obj,path, value) {  //path like profile or profile.favs ,...
  var schema = obj;  // a moving reference to internal objects within obj
  var pList = path.split('.');
  var len = pList.length;
  for(var i = 0; i < len-1; i++) {
      var elem = pList[i];
      if( !schema[elem] ) schema[elem] = {}
      schema = schema[elem];
  }
  schema[pList[len-1]] = value;
  
}

function unsetObjectKey(obj,path) { //path like profile or profile.favs ,...
  var schema = obj;  // a moving reference to internal objects within obj
  var pList = path.split('.');
  var len = pList.length;
  for(var i = 0; i < len-1; i++) {
      var elem = pList[i];
      if( !schema[elem] ) schema[elem] = {}
      schema = schema[elem];
  }
  delete schema[pList[len-1]]
}