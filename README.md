## __EJWT : Express Enhanced JSON Web Token__
__node version  >= 10__

### Features
- It can be used as a authenticator & session data
- It can be used as stateless or statefull(with redis for horizontal scaling) 
- Csruf protection
- Captcha spam protection

### Install
```
    npm install aghae/express-ejwt 
```

### Usage
```javascript

    const options={
        use_redis : false,       //use redis or not
        expire: 60,              //in seconds
        
        sec_cookie: false,      //if true only pass on https
                                // on develop mode set it to false
        redis_host:'localhost',
        redis_port:6379,
        secret :`$eCr3T`,
    }
    const ejwt  = require('express-ejwt')(options); 
    //important : with app instance 
    app.use(function(req,res,next){_req=req,_res=res,next()})
    
```

### Example
```javascript
    const express = require('express')
    const app = express()
    port = process.env.port || 3000
    
    const ejwt  = require('express-ejwt')({
        use_redis : false,      
        expire: 300,         
        sec_cookie: false,      
        redis_host:'localhost',
        redis_port:6379,
        secret :`$eCr3T`,
    }); 
    const bodyparser = require('body-parser');
    const cookieparser= require('cookie-parser')
    
    app 
      .use(cookieparser())
      .use(bodyparser.json())
      .use(bodyparser.urlencoded({ extended: false }))
      .use(function(req,res,next){_req=req,_res=res,next()})
    
    app.listen(port, () => console.log(`listening on port ${port}!`))
    
    
  //authentication middleware
    async function auth(req,res,next){
       await ejwt.get() ?next():res.send({err:'auth failed'})
    }
    
    /****** Routes **********************/
    
    app.get('/login', async(req, res)=> {
        
        await ejwt.set({ user:'aghae',rol:'admin' })
        res.json({ succ:'logined',
                   token:ejwt.token,
                   csrf_token: ejwt.data.csrf_token
        })
        /* 
          on mobile you must post token & csrf_token for each requests
        */
    })

    app.get('/logout', async(req, res)=> {
        await ejwt.unset()
        res.send('logouted.')
    })

    app.get('/with_auth',auth, async (req, res)=> {
        res.send('Authed. ;)')
    });

    app.get('/csrfgen', async (req, res)=> {
         res.json(await ejwt.csrfgen())
         /* in real world:
             await ejwt.csrfgen()
             res.render('your-form.hrml')
         */
    });

    app.get('/csrfchk', async (req, res)=> {
         //for test
         res.json(await ejwt.csrfchk())
         
         /* in real world
            var csrf_chk = await ejwt.csrfchk()
            if(csrf_chk.err) 
                res.send('csruf token error')
            else
                do somthing....
        */
    });

    app.get('/captcha', async function(req, res) {
       res.type('svg').send(await ejwt.captcha_gen())
    });
    
    app.get('/captcha-form', async function(req, res) {
       res.send(`
              <form method='POST' action='/captcha_chk' >
                <img src="/captcha" ><br>
                <input name='captcha' placeholder='Enter above text :'>
              </form>
        `,
        200,{'Content-Type':'text/html'})
    });
    
    app.post('/captcha_chk', async function(req, res) {
       res.send(await ejwt.captcha_chk())
    });


```

### Api

+ `await set (payload,expire=3600)`

  > set payload json data & return encoded token
  
+ `await get ()`  

   >   get payload  json data  
   
+ `await unset()`  

  >unset payload json data 
  
+ `await getkey (key)`

  >get specified payload key
  
+ `await setkey (key,val,expire = null) `

  > set payload key
  
+ `await unsetkey (key)`

  >unset specified payload key
  
+ `csrfgen ()`

    >Use it on form render route . check it out on above Test 
    
+ `csrfchk () `

    >On mobile app you must post __csrf_token__ to the route that use this 
    method 
    
+ `await captcha_gen (expire=0,captcha_name='captcha')`

    > On mobile app you must send __captcha_name__  input  as a posted data( by default captcha )  to the route that will call captcha_chk
    
+ `captcha_chk (captcha_name='captcha')`

  > check input posted captcha_name ( by default is captcha )
  
+ `data` 

  >  decoded data propery
  
+ `token`

  > generared token property

---

That's it.
good luck ;)
