import fs from "fs";
import {XMLParser} from "fast-xml-parser";
import {levelProgressProps} from "@/levels/levelsUtils";

type levelDataProps = {
  "@_number": string;
  "@_color": string;
  "@_modifier": string;
  "@_solution"?: string;
};

type levelSquareProps = {
  targetColor: string,
  modifier?: string,
  color?: string,
}

const colorMapping = {
  "r": "Color.red",
  "g": "Color.green",
  "b": "Color.blue",
  "o": "Color.yellow ",
  "d": "Color.indigo ",
  "0": "Color.none",
  "X": "Color.none",
};

const modifierMapping = {
  "0": "Modifier.none",
  "U": "Modifier.up",
  "R": "Modifier.right",
  "D": "Modifier.down",
  "L": "Modifier.left",
  "w": "Modifier.rotateUp",
  "x": "Modifier.rotateRight",
  "s": "Modifier.rotateDown",
  "a": "Modifier.rotateLeft",
  "F": "Modifier.circle",
  "B": "Modifier.bomb",
};


["Easy", "Medium", "Hard", "Community"].forEach((levelPack) => {
  const XMLFile = fs.readFileSync(`./Levels/levels${levelPack}.xml`, "utf-8");
  const levels: Array<Array<Array<levelSquareProps>>> = [];
  const defaultLevelProgress: Array<levelProgressProps> = [];
  // The `solution` attribute is a comma-separated list of moves (e.g. "A5,E1,E5,C3") - its
  // length is the minimum number of moves the level can be solved in. Not every level in every
  // pack has one, so this is null where it's missing.
  const optimalMoves: Array<number | null> = [];
  const parser = new XMLParser({ignoreAttributes: false});
  const levelObj = parser.parse(XMLFile);

  levelObj["levels"]["level"].forEach(
    (levelData: levelDataProps, levelNumber: number) => {
      levels.push([]);
      //@ts-ignore
      defaultLevelProgress.push({status: levelNumber < 5 ? "levelStatus.unlocked" : "levelStatus.locked", best: null})
      const solution = levelData["@_solution"];
      optimalMoves.push(solution ? solution.split(",").filter((move) => move.trim().length > 0).length : null);
      const colours = levelData["@_color"].split("\n");
      colours.forEach((line, lineNumber: number) => {
        levels[levelNumber].push([]);
        Array.from(line.trim()).forEach((color) => {
          levels[levelNumber][lineNumber].push({
            //@ts-ignore
            targetColor: colorMapping[color] || "Color.none",
          });
        });
      });
      const modifiers = levelData["@_modifier"].split("\n");
      modifiers.forEach((line, lineNumber: number) => {
        Array.from(line.trim()).forEach((modifier, squareNumber: number) => {
          //@ts-ignore
          const mod = modifierMapping[modifier] || "Modifier.none";
          //@ts-ignore
          const color = colorMapping[modifier] || "Color.none"
          levels[levelNumber][lineNumber][squareNumber].modifier = mod;
          if (mod !== "Modifier.none") {
            levels[levelNumber][lineNumber][squareNumber].color =
              levels[levelNumber][lineNumber][squareNumber].targetColor;
          } else {
            levels[levelNumber][lineNumber][squareNumber].color = color
          }
        });
      });
    }
  );

  // Stringify, and remove double quotes
  const unquotedLevels = JSON.stringify(levels).replace(/"+/g, "");
  const unquotedProgress = JSON.stringify(defaultLevelProgress).replace(/"+/g, "");
  const outputString = `import { Color, Modifier } from "@/components/Square/Square";
  import {Level} from "@/components/Game/Game";
  import {levelStatus, levelProgressProps} from "@/levels/levelsUtils";
  export const ${levelPack}Levels: Array<Level> = ${unquotedLevels}
  export const ${levelPack}DefaultProgress: Array<levelProgressProps> = ${unquotedProgress}
  export const ${levelPack}Optimal: Array<number | null> = ${JSON.stringify(optimalMoves)}`;
  fs.writeFileSync(`./levels/${levelPack}.ts`, outputString);
})
