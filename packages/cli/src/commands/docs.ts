const LINKS: { label: string; url: string }[] = [
  { label: "Repository", url: "https://github.com/dagimabebe/talak-web3" },
  { label: "Issues", url: "https://github.com/dagimabebe/talak-web3/issues" },
  { label: "npm scope @talak-web3", url: "https://www.npmjs.com/search?q=scope%3Atalak-web3" },
];

export async function docsCommand() {
  console.log("talak-web3 — documentation & links\n");
  for (const { label, url } of LINKS) {
    console.log(`  ${label}: ${url}`);
  }
  console.log("\n  Tip: run `talak doctor` in your app folder to verify setup.");
}
