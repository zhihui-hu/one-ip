import { atom } from "jotai";
import nodes from "../nodes.json";

export const selectedNodesAtom = atom(nodes.map((n) => n.id));
