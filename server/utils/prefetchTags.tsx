import * as React from "react";
import ReactDOMServer from "react-dom/server";
import env from "@server/env";
import readManifestFile, { ManifestStructure } from "./readManifestFile";

const isProduction = env.ENVIRONMENT === "production";

const prefetchTags = [];

if (process.env.AWS_S3_UPLOAD_BUCKET_URL) {
  prefetchTags.push(
    <link
      rel="dns-prefetch"
      href={process.env.AWS_S3_UPLOAD_BUCKET_URL}
      key="dns"
    />
  );
}

if (isProduction) {
  const manifest = readManifestFile();

  const returnFileAndImportsFromManifest = (
    manifest: ManifestStructure,
    file: string
  ): string[] => {
    return [
      manifest[file]["file"],
      ...manifest[file]["imports"].map((entry: string) => {
        return manifest[entry]["file"];
      }),
    ];
  };

  Array.from([
    ...returnFileAndImportsFromManifest(manifest, "app/index.tsx"),
    ...returnFileAndImportsFromManifest(manifest, "app/editor/index.tsx"),
  ]).forEach((file) => {
    if (file.endsWith(".js")) {
      prefetchTags.push(
        <link
          rel="prefetch"
          href={`${env.CDN_URL || ""}/static/${file}`}
          key={file}
          as="script"
          crossOrigin="anonymous"
        />
      );
    } else if (file.endsWith(".css")) {
      prefetchTags.push(
        <link
          rel="prefetch"
          href={`${env.CDN_URL || ""}/static/${file}`}
          key={file}
          as="style"
          crossOrigin="anonymous"
        />
      );
    }
  });
}

export default ReactDOMServer.renderToString(<>{prefetchTags}</>);
