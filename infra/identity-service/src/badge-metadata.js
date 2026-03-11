"use strict";

// GeniusSeeker Badge Metadata
// Individual IPFS CIDs for all 25 badge JSON metadata files + PNG images
// HashScan renders the image by fetching the JSON and reading the "image" field
// Gateway: https://ipfs.filebase.io/ipfs/

const GATEWAY = "https://ipfs.filebase.io/ipfs";

// JSON metadata CIDs — these go into the Hedera NFT metadata field
const JSON_CIDS = {
  "Arts_1":        "QmRDTJsbrWTeAd1DyYGtk2xJfgJQfkWyo83oeNMSM28JtK",
  "Arts_2":        "QmZngrEBMT6CkNo7HVpg2KjGqX37R5wXuYXQ9TQJVwKNbY",
  "Arts_3":        "QmaJmZ2ZLBB8zKr4TsXooJzbgq2xcyi88pvWX3K78yXKDJ",
  "Arts_4":        "QmUZt6873pNs3es9qmQNMtcJWTqGiwAVuc5yYywWvsj8M5",
  "Arts_5":        "Qmc4jVAyNfFcw4hxKMn4GNo7gmWcosgnGuJ3dCBzUZYYWp",
  "Engineering_1": "QmWUXTS5e486wnTtiCNfQzyrZ73W5xgNoPfAqGFaCAqG11",
  "Engineering_2": "Qma6VpSB4KHytyGTp4rE5tpJEbHxWBgGbbspLChGHb9g4U",
  "Engineering_3": "QmSQFRQnREUp9Y9absK5V6qe4NcbvZFBPESBPNQ4kHv5qt",
  "Engineering_4": "QmPnVxKj6gTD7fX7KjRLY6fFC4fsVzQZU5Wv9725U2z34y",
  "Engineering_5": "QmcLHGjeFEd4jK4owFGbRehwjimi92YD86bFGXgyU7yYuh",
  "Math_1":        "QmVT6H27nBVQGVzgpmL5rPQm16FvXwRYXYiGDXMgrgxn4h",
  "Math_2":        "QmU5KBxtci7f31Uzif8rKfsBNMvo9twTHWJ9d8QPR2ecgv",
  "Math_3":        "QmXaEdzA95At77t2wAM88bpMGWnmCdCuygVcjkRAkeyM8X",
  "Math_4":        "QmUH7uDjhSMTyYRus7SCTfRwjC6i82EVfdTqXYkUeCZHcx",
  "Math_5":        "Qmag81fshvuAtVzsfs15WSJNFeh4Nj3kXu6v3epcXRegFj",
  "Science_1":     "QmQ3DfRWCvJq9W6h4ix7ZDwxMy5jcGBbEnorMfwk7EK9hY",
  "Science_2":     "Qmc68vDkmtiLS1SacHqwz99YzsGRcxgsAn7kf225UTtH4o",
  "Science_3":     "QmVJvrpp9RAm9b34gjn7g9UoYicPxbbbpBqgSrHSpRi8Y1",
  "Science_4":     "QmeQUovQyfqZaUtN8T9NdTBB8gpXx81xnrxd4L7HcLL3Jf",
  "Science_5":     "QmepUmoxApzMYWdpGpyCXdgKfxo2HG25az2TpLZniM3E5Z",
  "Technology_1":  "QmcbyhCuik4NiuspNVVzzTP94edc87JSc13GJjR4ZYCH9d",
  "Technology_2":  "QmQJLXbHX6saKnvNuFarcLc4aNZuQnpcKkAbQ456jU2arJ",
  "Technology_3":  "QmPYQyfK2cYRNDo4y491EY9eVrWdm6Cy2pxCfNgmiuPfXC",
  "Technology_4":  "QmZnyxKYrgekyqcxaRKxHx6J4G4spm5j6CtHkCRjRA3e9x",
  "Technology_5":  "QmdSHRgt6HHHkyrinrZwaCiUuftead78Tfre9bztkjLbZj",
};

// PNG image CIDs — used for direct image display on the site
const PNG_CIDS = {
  "Arts_1":        "QmXsHqXskqhfzx37BYiGEbZdm9f4CCv9Q8tZcKSt5338Si",
  "Arts_2":        "QmSrK24JkWESNpDst7ypmBkwcNgPE9Pk5Dtd7wUz8aV8Tz",
  "Arts_3":        "QmYEwyFKafuEFChcJXXMATGLXtGQ6VnNC4v8zPW5D7yW5X",
  "Arts_4":        "QmdWL551YLrTKjA5KY4bWuPiMJd94xfhjFW1f2Aijr64CZ",
  "Arts_5":        "QmfGJATaW4AJtmSEM6b5o6oWVPrxHey27NoM6J8zYBo7NE",
  "Engineering_1": "QmXdX75qVtdo7GKgpPqAxvhNEaGh372xPWbViJf1yX5XoR",
  "Engineering_2": "QmYeZymJJNTpzdgDTTsFeTR4HKCeQfd7reJqnPMByPFAx7",
  "Engineering_3": "QmUHSFBLvFCSfpmmFcW1oYusXSpvzRvWRHv3xaL7o7Qb8i",
  "Engineering_4": "QmbEaSh4TtzvFz7obSYRLtJigyN8pht3gDSBFSPJR5kDQ5",
  "Engineering_5": "QmRLtfiwcAYKwQNBZh6z9manT4FpUVjP37t2jBTtKqSQrT",
  "Math_1":        "QmPGBGyisrHYaiww7Y442opcPCykRuxgBS24QxBBUtnFZi",
  "Math_2":        "QmWySvJ8Wep6K6qP8nMvWALoHsgw443vUrbxfTgWAW2G6K",
  "Math_3":        "Qmcjya8EAeNfqxzX9tt4W26YFsC2Y4W5KZD7Hakkwy712A",
  "Math_4":        "QmXPgXRYUarcgxVs6RN9CF2pwrmX6fNv7i493suQSpsrBj",
  "Math_5":        "QmdtuBmp4Mfq3cpMbdwCjMUmx6gTaymwbM6aBsiUNvLdVo",
  "Science_1":     "Qmc1V1Py7sTNaW8b2Efax3G8WuRbXMuVF52kQ9788PzwmK",
  "Science_2":     "QmYoYK8FwecifVPGBKDp1mNPKp1GWo4HmbKsRwvyepDER2",
  "Science_3":     "QmTF72EzyBN7voKNzPtFMACFhEAkBTpiyDVkN7SVnKQLnE",
  "Science_4":     "QmcZVPPiMktHip3ddYqrqrz3LAbzCWcuNhy28TEheTsuAk",
  "Science_5":     "QmPqJWMm48zrXX2PEkbsF3yezKXLBKLBZX56oxxPHNdSnE",
  "Technology_1":  "QmSAS71YkEnBg69L1Mcit5J6CqmoyKGdKiQQ2NH92x4E3o",
  "Technology_2":  "QmbKiQoYjGL1NroKBS6fSKLq2PwoL45tsWWgctTjBcWmjk",
  "Technology_3":  "Qme1kF56aAWS4UxLHknw3ciyvZJpVDnhyyBcyWLAHG96Vj",
  "Technology_4":  "QmTee1cj4xzeSx5Es8b7NdV4oNYfrN1wFAWLLeWTLpuigt",
  "Technology_5":  "Qmeyq3NxHbSSEJje2iQ4mf9FGTbLKdHZgPV1DQQhQWazJH",
};

const CATEGORY_MAP = {
  "Arts":        "Arts",
  "Engineering": "Engineering",
  "Mathematics": "Math",
  "Math":        "Math",
  "Science":     "Science",
  "Technology":  "Technology",
};

function getKey(category, level) {
  const cat = CATEGORY_MAP[category];
  if (!cat || !level) return null;
  return `${cat}_${level}`;
}

/** HTTPS URL for the badge JSON metadata (for display/debug) */
function getBadgeMetadataUrl(category, level) {
  const key = getKey(category, level);
  const cid = JSON_CIDS[key];
  if (!cid) return null;
  return `${GATEWAY}/${cid}`;
}

/** HTTPS URL for the badge PNG image (for display on the site) */
function getBadgeImageUrl(category, level) {
  const key = getKey(category, level);
  const cid = PNG_CIDS[key];
  if (!cid) return null;
  return `${GATEWAY}/${cid}`;
}

/**
 * Bytes stored in the Hedera NFT metadata field.
 * Points to the JSON metadata file so HashScan can resolve the image.
 * All under 60 bytes ✓
 */
function getBadgeMetadataBytes(category, level) {
  const key = getKey(category, level);
  const cid = JSON_CIDS[key];
  if (!cid) return Buffer.from("GeniusSeeker STEAM Badge");
  return Buffer.from(`ipfs://${cid}`);
}

/** Full badge info object for profile display */
function getBadgeInfo(category, level) {
  const key = getKey(category, level);
  if (!JSON_CIDS[key]) return null;
  return {
    imageUrl:    getBadgeImageUrl(category, level),
    metadataUrl: getBadgeMetadataUrl(category, level),
    ipfsUri:     `ipfs://${JSON_CIDS[key]}`,
    category,
    level,
    name:        `${category} Badge Level ${level}`,
    description: `Genius Certified ${category} badge representing proficiency at Level ${level}.`,
  };
}

module.exports = {
  getBadgeMetadataUrl,
  getBadgeImageUrl,
  getBadgeMetadataBytes,
  getBadgeInfo,
  GATEWAY,
  JSON_CIDS,
  PNG_CIDS,
};
