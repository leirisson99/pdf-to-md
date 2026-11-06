import Footer from "@/components/Footer";
import Header from "@/components/Header";
import UploadForm from "@/components/UploadForm";

export default function Home() {
  return (
    <>
      <Header />
      <main className="flex flex-1 flex-col items-center px-4 pb-16 pt-12 sm:pt-20">
        <h1 className="text-center text-4xl font-bold tracking-tight sm:text-5xl">
          PDF to Markdown
        </h1>
        <p className="mt-3 max-w-md text-center text-base text-muted sm:text-lg">
          Convert PDF files into clean, structured Markdown.
        </p>
        <div className="mt-10 w-full max-w-[680px]">
          <UploadForm />
        </div>
      </main>
      <Footer />
    </>
  );
}
