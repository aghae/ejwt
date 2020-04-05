// for node >=10

const ejwt = {
    conf:{},
    req:{},
    res:{},
    token : null,
    data : {},
    reqToken: ()=>{

        var useragent= ejwt.req.header('user-agent')
        var token,csrf_token;
        if(useragent.match(/html/i)){    //request from browser 
            token=ejwt.req.cookies && ejwt.req.cookies.token
            csrf_token=ejwt.req.cookies && ejwt.req.cookies.csrf_token

        } 
        if(useragent.match(/android|iphone|ipad|ipod|windows phone/i)){  // request from mobile app & not mobile browser
            token=ejwt.req.body && ejwt.req.body.token
            csrf_token=ejwt.req.body && ejwt.req.body.csrf_token
        }

        return {
                token: token!==undefined?token:null,
                csrf_token: csrf_token!==undefined?csrf_token:null,

         }
    },
	  do : async (action,payload,expire=ejwt.conf.expire)=>{
        try {
              var tid,token;

              token = await ejwt.get()
              tid=token?token.tokenId:uniqid()
              if(action=='unset') expire=1

              payload.tokenId=tid
              var csrf_token=uniqid()
              payload.csrf_token=csrf_token

              if(!token && expire) payload.tokenExpire=Date.now()+expire*1000

              if(ejwt.conf.use_redis){
                  if(action=='unset')
                      __redis.del(tid)

                  else{

                    if(expire) 
                        await __redis.set(tid,JSON.stringify(payload),'EX',expire)
                    else
                        await __redis.set(tid,JSON.stringify(payload))

                    token =  jwtsimple.encode({tokenId:tid}, ejwt.conf.secret);
                  }
              }
              else{
                  token =  jwtsimple.encode(payload, ejwt.conf.secret);
              }

              if(action=='unset' && ejwt.req.cookies && ejwt.req.cookies.token){
                  ejwt.res.clearCookie('token')
                  ejwt.res.clearCookie('csrf_token')
              }
              else
                  ejwt.res.setHeader('Set-Cookie',[`token=${token};HttpOnly`,`csrf_token=${csrf_token};HttpOnly`])
                
              ejwt.token=token
              ejwt.data=payload
              return token

        }catch(err){
          return {err:err.message}
        }
  },

  set: async (payload,expire=ejwt.conf.expire)=>{
      return ejwt.do('set',payload,expire)
  },

  unset: async ()=>{
      return ejwt.do('unset',{})
  },

  get:async ()=>{ //get data
    try{
        var reqToken=ejwt.reqToken()
        var token = reqToken.token
        if(!token) return null

        var decoded = jwtsimple.decode(token, ejwt.conf.secret)

        for(var item of Object.keys(decoded)){
          var expire_item=item+'_expire'
          if(expire_item && Date.now()>decoded[expire_item]){
              delete decoded[item]
              delete decoded[expire_item]
          }
        }

        var ret=null
        if(ejwt.conf.use_redis){
          if(decoded.tokenId) 
            ret = await __redis.get(decoded.tokenId) 
            ret=JSON.parse(ret)
          
        }
        else{

            if (ejwt.conf.expire && Date.now()>decoded.tokenExpire)
                ret=null
            else{
                // delete decoded.captcha
                // delete decoded.tokenId
                // delete decoded.csrf_token
                // delete decoded.tokenExpire
                ret = decoded
            }
        }
        ejwt.data = decoded
        return ret

    }catch(err){
      return {err:err.message}
    }
    

  },

  getkey: async (key)=> {
    var data = await ejwt.get()
    if(data[key+'_expire'] && Date.now()>data[key+'_expire']){
        delete data[key]
        delete data[key+'_expire']
        ejwt.set(data)
    }
    return (data  &&  data[key])?data[key]:null
  },

  setkey: async (key,val,expire = null)=> {
    try{
        var data = await ejwt.get()
        var pl=(!data)?{}:data
         pl[key]=val
         if(expire) pl[key+'_expire']=Date.now()+expire*1000
         await ejwt.set(pl)
     }catch(err){
       return {err:err.message}
     }

  },

  unsetkey: async (key)=> {
     var data = await ejwt.get()
      try{
          if(data){
              delete data[key]
              if(data[key+'_expire'])
                delete data[key+'_expire']
              await ejwt.set(data)
          }
       }catch(err){
         return {err:err.message}
       }
  },

   csrfgen: async ()=> {
    try{
       await ejwt.set(ejwt.data)
       return {
          token: ejwt.token,
          csrf_token: ejwt.data.csrf_token
       }
     }catch(err){
       return {err:err.message}
     }

  },

    csrfchk: async ()=> {
    try{
        var ejwt_csrf_token = await  ejwt.getkey('csrf_token')
        // var  cookie_csrf_token = ejwt.req.cookies && ejwt.req.cookies.csrf_token
        var reqToken=ejwt.reqToken()
        var reqToken_csrf = reqToken.csrf_token

        if(!ejwt_csrf_token || ejwt_csrf_token!=reqToken_csrf)
            return {err:'invalid csrf token :('}
        else
            return {succ:'csurf token is valid :)'}
    }catch(err){
        return {err:err.message}
    } 
  },

   captcha_gen: async (expire=0,captcha_name='captcha')=> {
    try{
       var svgCaptcha = require('svg-captcha');
       var captcha = svgCaptcha.create();
       await  ejwt.setkey(captcha_name,captcha.text,expire)
       return captcha.data
     }catch(err){
       return {err:err.message}
     }
   },

   captcha_chk: async (captcha_name='captcha')=> {
      try{
        input=ejwt.req.body[captcha_name]
        var ejwt_captcha = await  ejwt.getkey(captcha_name)
        if(ejwt_captcha && input==ejwt_captcha)
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
 console.log(ejwt.req)
  ejwt.conf={
        use_redis    : def(options.use_redis    , false         ),       //true : use redis , false : use only jwt for store payload
        expire       : def(options.expire         , 3600        ),       // in seconds
        secret       : def(options.secret        , `$eCr3T`     ),
        sec_cookie   : def(options.sec_cookie    , false        ),       // if true only pass on https . on develop set it to false
        redis_host   : def(options.redis_host   , 'localhost'   ),
        redis_port   : def(options.redis_port   , 6379          ),
        redis_pass   : def(options.redis_pass   , ''            )
  }

   if(ejwt.conf.use_redis){
        var REDIS   = require("async-redis");
        __redis   = REDIS.createClient(ejwt.conf.redis_port,ejwt.conf.redis_host)
        if(ejwt.conf.redis_pass)
          __redis.auth(ejwt.conf.redis_pass)
      
  }
  return ejwt
}


