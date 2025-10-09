import bibleVersions from "@/assets/data/bible-versions.json";

// Create a type for the bible versions
interface BibleVersions {
  [key: string]: string;
}

export const getBibleVersionDisplayName = (key: string) => {
  return (bibleVersions as BibleVersions)[key] || '';
};