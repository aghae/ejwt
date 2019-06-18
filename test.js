  
env={
    use_redis : false,       //use redis or not
    expire: 60,           //in seconds
    sec_cookie: false,      //if true only pass on https . on develop set it to false
    redis_host:'localhost',
    redis_port:6379,
    secret :`$eCr3T`,

    port : 3000,
}

const express = require('express')
const app = express()
const bodyparser = require('body-parser');
const cookieparser= require('cookie-parser')

const ejwt  = require('express-jwt-enhanced')(env); 


app 
  .use(cookieparser())
  .use(bodyparser.json())
  .use(bodyparser.urlencoded({ extended: false }))
  .use(function(req,res,next){_req=req,_res=res,next()})

app.listen(env.port, () => console.log(`listening on port ${env.port}!`))


/*******************************************************************
   Middlewares
*******************************************************************/

async function auth(req,res,next){
   await ejwt.get() ?next():res.send({err:'auth failed'})
}
  

/*******************************************************************
  Routes
*******************************************************************/


app.get('/', (req, res) => {
  res.end('Helo polka!');

})

app.get('/login', async(req, res)=> {

    await ejwt.set({ user:'aghae',rol:'admin' })

    res.json({ succ:'logined',
               token:ejwt.token,
               csrf_token: ejwt.data.csrf_token
             })
})

app.get('/logout', async(req, res)=> {
    await ejwt.unset()
    res.send('logouted.')
})

app.all('/get',auth, async (req, res)=> {
    res.send(await ejwt.get())
});


app.get('/csrfgen', async (req, res)=> {
    res.json(await ejwt.csrfgen())
   /* in real world:
       await ejwt.csrfgen()
       res.render('your-form.hrml')
   */

    // On `mobile app` you must post csrf_token to route that use csrfchk()

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
        200,
        {'Content-Type':'text/html'}
    )
});

app.post('/captcha_chk', async function(req, res) {
   res.send(await ejwt.captcha_chk())
    
});


