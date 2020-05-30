## __Express JWT Enhanced__ 

### Features
- It can be used as a authenticator & session data
- It can be used as stateless or statefull(with redis for horizontal scaling) 
- with csrf & captcha protection ability

### Install

```
    npm install --force express-jwt-enhanced
```

### Usage
```javascript
    const express = require('express')
    const app = express()

    const bodyparser = require('body-parser');   //necessary for getting posted data from client (posted csrf & captcha text)
    const cookieparser= require('cookie-parser') //necessary for web apps (by default it stored in cookie on client side)  . for mobile apps you can get it via json result

    const options={
        expire: 3600,           // alive for seconds
        secret :`$eCr3T`,       // importat!!!! : change it
        sec_cookie: false,      // if true only pass on https. on develop dont set it to true

        use_redis : false,      // use redis or not
        redis_host:'localhost',
        redis_port:6379,
        redis_pass:'',
        
    }
    const ejwt  = require('express-jwt-enhanced')(options); 
    app.use(cookieparser())
       .use(bodyparser.json())
       .use(bodyparser.urlencoded({ extended: false }))
       .use(function(req,res,next){ejwt.req=req,ejwt.res=res,next()})   
    
```

### Example 
**Auth Middleware**

```javascript
async function auth(req,res,next){
    await ejwt.get() ? next() : res.send({err:'auth failed'})
}
```
 
**Login**
```javascript

app.get('/login', async(req, res)=> {
  
  await ejwt.set({ user:'aghae',rol:'admin' })
  res.json({ succ:'logined',
              token:ejwt.token,
              csrf_token: ejwt.data.csrf_token
  })

  /* for `web app` everything is.
     for `mobile app` you must post these token  & csrf_token for each requests
  */
})
```


**Logout**        
```javascript
app.get('/logout', async(req, res)=> {
    await ejwt.unset()
    res.send('logouted.')
});
```

**Is Authed**        
```javascript
app.get('/is_authed',auth, async (req, res)=> {
    res.send('Authed. ;)')
});
```

**CSRF Generate**        
```javascript
app.get('/csrfgen', async (req, res)=> {

    res.json(await ejwt.csrfgen())

    /* in real world:

      await ejwt.csrfgen()
      res.render('your-form.hrml')

    */
});
```

**CSRF Check**        
```javascript
app.get('/csrfchk', async (req, res)=> {

    res.json(await ejwt.csrfchk())
    
    /* in real world
    
      var csrf_chk = await ejwt.csrfchk()
      if(csrf_chk.err) 
          res.send('csruf token error')
      else
          do somthing....
    */
});
```

**Captcha**        
```javascript
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


app.post('/captcha_chk', async function(req, res) { //this must be post method
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
  
+ `await csrfgen ()`

    >Use it on form render route . check it out on above Test 
    
+ `await csrfchk () `

    >For mobile app you must post __csrf_token__ to the route that use this 
    method 
    
+ `await captcha_gen (expire=0,captcha_name='captcha')`

    > For mobile app you must send __captcha_name__  input  as a posted data( by default captcha )  to the route that will call captcha_chk
    
+ `await captcha_chk (captcha_name='captcha')`

  > check input posted captcha_name ( by default is captcha )
  
+ `data` 

  >  decoded data propery
  
+ `token`

  > generared token property

---

That's it.
good luck ;)
