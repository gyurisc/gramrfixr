import Head from "next/head";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ContentEditor from "@/components/ContentEditor/ContentEditor";

export default function Home() {
  return (
    <div className="mx-auto my-8 flex min-h-screen max-w-5xl flex-col px-4 sm:my-16">
      <Head>
        <title>GramrFixr</title>
        <meta
          name="description"
          content="An easy to use app to fix your grammar"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Header />
      <main>
        <ContentEditor />
      </main>
      <Footer />
    </div>
  );
}
