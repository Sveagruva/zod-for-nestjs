# zod-for-nestjs by Sveagruva

Use zod schemas directly with decorators for validation and documentation of your nestjs api.

----

## Installation

```shell
npm install zod-for-nestjs zod
yarn add zod-for-nestjs zod
pnpm install zod-for-nestjs zod
```

----

## Usage

zod-for-nestjs exports following members: ZBody, ZParams, ZQuery, ZReturn


```typescript

import { Controller, Get, Param } from "@nestjs/common";
import { z } from "zod";
import { ZParams, ZReturn } from "zod-for-nestjs";

const catSchema = z.object({
    name: z.string(),
    age: z.number(),
    createdAt: z.date(),
});

const catInputSchema = z.object({
    name: z.string(),
    // note that query input is always string
    age: z.string(),
});

@Controller("cats")
export class CatsController {
    
    @Get("/cats")
    @ZQuery(catInputSchema)
    @ZReturn(catSchema, 200)
    findAll(@Query() params: z.infer<typeof catInputSchema>) {
        return {
            name: params.name,
            age: parseInt(params.age),
            createdAt: new Date(),
        };
    }
}


```
