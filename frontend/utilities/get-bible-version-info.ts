import bibleVersions from "@/assets/data/bible-versions.json";

// Create a type for the bible versions
interface BibleVersions {
  [key: string]: { fullname: string; supported: boolean; };
}

export const getSupportedBibleVersions = (): { key: string; fullname: string }[] => {
  const versions = bibleVersions as BibleVersions;

  return Object.entries(versions)
    .filter(([_, value]) => value.supported)
    .map(([key, value]) => ({
      key,
      fullname: value.fullname
    }));
};

export const getBibleVersionDisplayName = (key: string): string => {
  return (bibleVersions as BibleVersions)[key].fullname || '';
};

export const getSupportedBibleVersionsShortNames = (): string[] => {
  const versions = bibleVersions as BibleVersions;
  return Object.keys(versions).filter((key) => versions[key].supported);
};

export const getSupportedBibleVersionDisplayNames = (): string[] => {
  const versions = bibleVersions as BibleVersions;
  return Object.values(versions)
    .filter((v) => v.supported)
    .map((v) => v.fullname);
};