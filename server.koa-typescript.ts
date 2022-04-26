import Koa from 'koa';
import connect from 'koa-connect';
import { createServer as createViteServer } from 'vite';
import fs from 'node:fs';
import path from 'node:path';

async function createServer() {
    const app = new Koa();

    const vite = await createViteServer({
        server: { middlewareMode: 'ssr' }
    })

    app.use(connect(vite.middlewares))

    app.use(async (ctx, next) => {
        const url = ctx.req.url

        console.log('Koa typescript server');

        try {
            // 1. Read index.html
            let template = fs.readFileSync(
                path.resolve(__dirname, 'index.html'),
                'utf-8'
            )

            // 2. Apply Vite HTML transforms. This injects the Vite HMR client, and
            //    also applies HTML transforms from Vite plugins, e.g. global preambles
            //    from @vitejs/plugin-react
            template = await vite.transformIndexHtml('/index.html', template)

            // 3. Load the server entry. vite.ssrLoadModule automatically transforms
            //    your ESM source code to be usable in Node.js! There is no bundling
            //    required, and provides efficient invalidation similar to HMR.
            const { render } = await vite.ssrLoadModule('/src/index.server.ts')

            // 4. render the app HTML. This assumes entry-server.js's exported `render`
            //    function calls appropriate framework SSR APIs,
            //    e.g. ReactDOMServer.renderToString()
            const appHtml = await render(url)

            // 5. Inject the app-rendered HTML into the template.
            const html = template.replace(`<!--ssr-outlet-->`, appHtml)

            // 6. Send the rendered HTML back
            // ctx.res.status(200).set({ 'Content-Type': 'text/html' }).end(html)

            ctx.response.body = html;
            ctx.response.headers['Content-Type'] = 'text/html';

        } catch (e) {
            console.log('e', e);
            // If an error is caught, let Vite fix the stracktrace so it maps back to
            // your actual source code.
            vite.ssrFixStacktrace(e as Error)

            throw e;
        }
    })



    await app.listen(3003);
}


createServer().then(() => {
    console.log('Server started at http://localhost:3003')
})
