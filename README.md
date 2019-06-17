## __EJWT : Express Enhanced JSON Web Token__
__node version  >= 10__

### Features
- It can be used as a authenticator or session data
- It can be used as stateless or statefull(with redis for horizontal scaling) 
- Csruf protection
- Captcha spam protection

### Install
```
    npm install aghae/ejwt 
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
    const ejwt  = require('ejwt')(options); 
    //important : with app instance 
    app.use(function(req,res,next){_req=req,next()})
```

### Test
```javascript
    const express = require('express')
    const app = express()
    port = process.env.port || 3000
    
    const ejwt  = require('aghae/ejwt')({
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
    
    /*******Middlewares  ***************/
    
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

    app.get('/capcha', async function(req, res) {
       res.type('svg').send(await ejwt.capcha_gen())
    });
    
    app.get('/capcha-form', async function(req, res) {
       res.send(`
              <form method='POST' action='/capcha_chk' >
                <img src="/capcha" ><br>
                <input name='captcha' placeholder='Enter above text :'>
              </form>
        `,
        200,{'Content-Type':'text/html'})
    });
    
    app.post('/capcha_chk', async function(req, res) {
       res.send(await ejwt.capcha_chk())
    });


```

### Api
All methods are async/await 
+ set (payload,expire=3600)
+ get ()   `get payload`     
+ unset()  `unset payload data `
+ getkey (key) `get specified payload key`
+ setkey (key,val,expire = null) 
+ unsetkey (key)
+ csrfgen ()
    >Use it on form render route . check it out on above Test 
+ csrfchk () 
    >On `mobile app` you must post __csrf_token__ to route that use this method 
+ capcha_gen (expire=0,captcha_name='captcha')
    > On mobile you must post __captcha_name__ on post form to route that will call capcha_chk
+ capcha_chk (captcha_name='captcha')
+ data `get decoded data`
+ token `get generared token`

---

That's it.
good luck ;)
