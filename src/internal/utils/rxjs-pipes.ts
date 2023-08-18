import { filter } from "rxjs";

export const notNull = filter(v => !!v);