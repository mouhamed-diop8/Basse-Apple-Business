import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

/**
 * Document HTML de la version web : viewport fluide pour téléphone et ordinateur.
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="fr">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />
        <title>Basse Apple Business</title>
        <ScrollViewStyleReset />
        <style
          dangerouslySetInnerHTML={{
            __html: `
            html, body, #root { height: 100%; }
            html { overflow-x: hidden; }
            body { margin: 0; background: #F7F7F9; overflow-x: hidden; -webkit-text-size-adjust: 100%; }
            #root { min-width: 0; }
            img, svg, video, canvas { max-width: 100%; height: auto; }
            a, button, [role="button"], [data-focusable="true"] { cursor: pointer; }
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
