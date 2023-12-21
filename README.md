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

zod-for-nestjs exports following members: ZBody, ZParam, ZQuery, ZReturn


```typescript

import { Controller, Get, Param } from "@nestjs/common";
import { z } from "zod";
import { ZParam, ZQuery, ZReturn } from "zod-for-nestjs";

const catSchema = z.object({
    id: z.string(),
    name: z.string(),
    age: z.number(),
    createdAt: z.date(),
});

const catQuerySchema = z.object({
    name: z.string(),
    // note that query input is always string
    age: z.string(),
});

const catParamSchema = z.object({
    id: z.string(),
});

@Controller("/cats")
export class CatsController {
    
    @Get("/:id")
    @ZQuery(catQuerySchema)
    @ZParam(catParamSchema)
    @ZReturn(catSchema, 200)
    findAll(
        @Query() query: z.infer<typeof catQuerySchema>,
        @Param() param: z.infer<typeof catParamSchema>
    ) {
        return {
            id: param.id,
            name: query.name,
            age: parseInt(query.age),
            createdAt: new Date(),
        };
    }
}


```
