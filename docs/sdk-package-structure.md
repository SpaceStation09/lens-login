# SDK Package Structure

本文档说明当前 `lens-login` 项目里 SDK 的分包结构，以及每一层分别提供什么能力。

## 总体结构

当前 SDK 相关代码已经整理成 workspace 包：

```txt
packages/
  lens-login/
    package.json
    README.md
    src/
      index.ts
      client/
        index.ts
      server/
        index.ts
      shared/
        types.ts
        utils.ts
```

同时 demo app 里还有一层适配代码：

```txt
lib/
  lens/
    client.ts
    server.ts
    types.ts
```

这层 `lib/lens/*` 主要是给当前 demo 使用的桥接层，不是最终 SDK 核心本体。

## 分层职责

这套结构的核心思路是把系统拆成三层：

1. `client`
   浏览器端接入层
2. `server`
   服务端认证逻辑层
3. `shared`
   前后端共享协议与类型层

这样做的好处是：

1. 前端项目只依赖 `client`
2. 后端项目只依赖 `server`
3. 双方通过 `shared` 保持协议一致

## `@demo/lens-login/client`

入口文件：

```txt
packages/lens-login/src/client/index.ts
```

职责：

- 浏览器端钱包连接
- 发起 challenge 请求
- 调用钱包签名
- 提交 verify 请求
- 将登录流程串联起来

当前提供的核心能力：

### `createLensLoginClient(options)`

创建前端 SDK 实例。

参数：

```ts
type LensLoginClientOptions = {
  apiBasePath?: string
  ethereum?: {
    request: (request: { method: string; params?: unknown[] }) => Promise<unknown>
  }
  fetch?: typeof fetch
}
```

字段说明：

- `apiBasePath`
  指向你应用里 Lens auth API 的基础路径。
  默认值是 `"/api/auth/lens"`。

- `ethereum`
  一个 EIP-1193 provider。
  如果不传，SDK 会尝试从 `window.ethereum` 读取。

- `fetch`
  可选自定义 `fetch` 实现，便于测试或特殊运行环境接入。

作用：

- 初始化一个浏览器端 Lens login client
- 为后续的钱包连接、签名和后端认证请求提供统一入口

返回：

- `LensLoginClient<TUser>` 实例

典型调用：

```ts
const client = createLensLoginClient({
  apiBasePath: "/api/auth/lens",
})
```

### `connectWallet()`

连接钱包并返回当前 EVM 地址。

参数：

- 无

作用：

- 调用 provider 的 `eth_requestAccounts`
- 触发钱包连接流程
- 返回当前选择的钱包地址

返回：

```ts
Promise<string>
```

返回值说明：

- 返回规范化后的 EVM 地址，小写字符串形式

典型调用：

```ts
const walletAddress = await client.connectWallet()
```

### `signMessage(message)`

使用当前钱包对 challenge message 进行签名。

参数：

```ts
message: string
```

作用：

- 使用当前 provider 创建钱包客户端
- 获取当前选中的钱包地址
- 对传入的 challenge message 进行签名

返回：

```ts
Promise<`0x${string}`>
```

返回值说明：

- 返回标准 EVM 签名字符串

典型调用：

```ts
const signature = await client.signMessage(challenge.message)
```

### `discoverAccounts({ walletAddress })`

调用服务端 `/accounts`，查询该钱包当前控制的 Lens accounts。

参数：

```ts
type LensAccountsRequest = {
  walletAddress: string
}
```

作用：

- 把钱包地址发送到服务端
- 由服务端调用 Lens API
- 返回该钱包当前可控制的 Lens accounts 列表

返回：

```ts
Promise<LensAccountsResponse>
```

响应结构：

```ts
type LensAccountsResponse = {
  walletAddress: string
  accounts: LensDiscoveredAccount[]
}
```

`LensDiscoveredAccount` 结构：

```ts
type LensDiscoveredAccount = {
  accountAddress: string
  username: {
    fullHandle: string | null
    localName: string | null
    namespace: string | null
  } | null
  metadata: {
    displayName: string | null
    picture: string | null
  } | null
}
```

典型调用：

```ts
const result = await client.discoverAccounts({ walletAddress })
const accounts = result.accounts
```

### `createChallenge({ type, walletAddress, lensAccountAddress })`

调用服务端 `/challenge`，创建一次登录或绑定流程的 challenge。

参数：

```ts
type LensChallengeRequest = {
  type: "login" | "link"
  walletAddress: string
  lensAccountAddress: string
}
```

字段说明：

- `type`
  认证意图。
  `login` 表示登录，`link` 表示给当前已登录用户绑定 Lens。

- `walletAddress`
  本次 challenge 绑定的钱包地址。

- `lensAccountAddress`
  本次 challenge 绑定的 Lens account 地址。

作用：

- 请求服务端生成一次 challenge
- challenge 会把 `wallet + lensAccount + type + nonce + expiresAt` 一起绑定

返回：

```ts
Promise<LensChallengeResponse>
```

响应结构：

```ts
type LensChallengeResponse = {
  challengeId: string
  type: "login" | "link"
  walletAddress: string
  lensAccountAddress: string
  message: string
  expiresAt: string
}
```

典型调用：

```ts
const challenge = await client.createChallenge({
  type: "login",
  walletAddress,
  lensAccountAddress,
})
```

### `verify({ challengeId, signature })`

调用服务端 `/verify`，提交签名并完成认证。

参数：

```ts
type LensVerifyRequest = {
  challengeId: string
  signature: `0x${string}`
}
```

作用：

- 把 challenge id 和签名提交给服务端
- 由服务端完成 challenge 校验、签名恢复、Lens account 控制关系校验
- 最终返回认证结果

返回：

```ts
Promise<LensVerifyResponse<TUser>>
```

响应结构：

```ts
type LensVerifyResponse<TUser> = {
  ok: true
  action: "login" | "link"
  user: TUser
  identity: LensVerifiedIdentity
  isNewUser: boolean
}
```

`LensVerifiedIdentity` 结构：

```ts
type LensVerifiedIdentity = {
  providerSubject: string
  walletAddress: string
  lensAccountAddress: string
  username: {
    fullHandle: string | null
    localName: string | null
    namespace: string | null
  } | null
  metadata: {
    displayName: string | null
    picture: string | null
  } | null
}
```

典型调用：

```ts
const result = await client.verify({
  challengeId: challenge.challengeId,
  signature,
})
```

### `authenticate(...)`

把 `createChallenge + signMessage + verify` 串起来的一步式调用。

参数：

```ts
{
  type: "login" | "link"
  walletAddress: string
  lensAccountAddress: string
}
```

作用：

- 创建 challenge
- 使用钱包签 challenge message
- 提交 verify
- 返回最终认证结果

适合：

- 前端想用“一步式”接口时使用
- 不想手动拆 challenge / sign / verify 三步时使用

返回：

```ts
Promise<LensVerifyResponse<TUser>>
```

典型调用：

```ts
const result = await client.authenticate({
  type: "login",
  walletAddress,
  lensAccountAddress,
})
```

适用场景：

- React 前端
- Next.js 前端
- 任意浏览器端接入场景

## `@demo/lens-login/server`

入口文件：

```txt
packages/lens-login/src/server/index.ts
```

职责：

- 查询 Lens account
- 创建 challenge
- 验签
- 校验钱包对 Lens account 的控制关系
- 将 Lens identity 映射到本地用户
- 处理登录与绑定两条主流程

当前提供的核心能力：

### `createLensLoginServer(options)`

创建服务端认证实例。

参数：

```ts
type LensLoginServerOptions<TUser extends { id: string }> = {
  environment?: "mainnet" | "testnet"
  origin?: string
  storage: LensLoginServerStorage
  setSession: (user: TUser) => Promise<void>
  findUserById: (userId: string) => Promise<TUser | null>
  createUser: () => Promise<TUser>
}
```

字段说明：

- `environment`
  Lens 环境，默认由 `NEXT_PUBLIC_LENS_ENV` 决定。

- `origin`
  Lens PublicClient 初始化所需 origin，默认读取 `NEXT_PUBLIC_APP_ORIGIN`。

- `storage`
  SDK 所需的 challenge 和 identity 持久化能力。

- `setSession`
  当登录成功时，如何为当前用户建立业务 session。

- `findUserById`
  根据本地 user id 获取用户。

- `createUser`
  Lens 首次登录时，如何创建本地用户。

作用：

- 创建一套可复用的服务端 Lens auth 核心实例
- 不绑定任何具体后端框架
- 不绑定任何具体数据库实现

返回：

- `LensLoginServer<TUser>` 实例

典型调用：

```ts
const server = createLensLoginServer({
  storage,
  setSession,
  findUserById,
  createUser,
})
```

### `discoverAccounts({ walletAddress })`

查询某钱包在 Lens 上可用的 accounts。

参数：

```ts
type LensAccountsRequest = {
  walletAddress: string
}
```

作用：

- 调用 Lens `fetchAccountsAvailable`
- 查询该钱包当前控制的 Lens accounts
- 规范化返回数据，供前端展示和后续 challenge 使用

返回：

```ts
Promise<LensAccountsResponse>
```

典型调用：

```ts
const result = await server.discoverAccounts({ walletAddress })
```

### `createChallenge({ ..., currentUserId })`

针对明确的 `wallet + lensAccount` 创建一次 challenge。

参数：

```ts
type LensChallengeRequestWithUser = {
  type: "login" | "link"
  walletAddress: string
  lensAccountAddress: string
  currentUserId: string | null
}
```

字段说明：

- `type`
  `login` 或 `link`

- `walletAddress`
  本次 challenge 绑定的钱包地址

- `lensAccountAddress`
  本次 challenge 绑定的 Lens account 地址

- `currentUserId`
  仅在 `link` 场景必须存在，表示当前业务用户是谁

作用：

- 校验钱包是否真的控制目标 Lens account
- 生成 nonce 和 message
- 将 challenge 落库存储

返回：

```ts
Promise<LensChallengeResponse>
```

典型调用：

```ts
const challenge = await server.createChallenge({
  type: "link",
  walletAddress,
  lensAccountAddress,
  currentUserId: user.id,
})
```

### `verifyChallenge({ challengeId, signature })`

完成 challenge 校验、签名恢复、钱包归属确认、用户创建或绑定、session 建立。

参数：

```ts
type LensVerifyRequest = {
  challengeId: string
  signature: `0x${string}`
}
```

作用：

- 查找 challenge
- 检查 challenge 是否存在、是否过期、是否已使用
- 从签名里恢复 signer wallet
- 确认 signer wallet 与 challenge 中的钱包一致
- 再次调用 Lens API，确认该钱包当前仍控制该 Lens account
- 根据 `type` 分流：
  - `login`: 查找或创建本地用户，并建立 session
  - `link`: 将该 Lens identity 绑定到当前用户

返回：

```ts
Promise<LensVerifyResponse<TUser>>
```

返回值含义：

- `action`
  本次执行的是 `login` 还是 `link`

- `user`
  当前最终映射到的本地用户

- `identity`
  本次认证通过的 Lens identity

- `isNewUser`
  仅在 `login` 场景有意义，表示是否是首次创建的本地用户

典型调用：

```ts
const result = await server.verifyChallenge({
  challengeId,
  signature,
})
```

### `toErrorResponse(error)`

将内部错误转成统一的 HTTP 错误结构，方便 route handler 直接返回。

参数：

```ts
error: unknown
```

作用：

- 把 SDK 内部错误映射成 HTTP 层可直接返回的结构
- 统一服务端 route 的错误输出格式

返回：

```ts
{
  status: number
  body: LensApiError
}
```

`LensApiError` 结构：

```ts
type LensApiError = {
  ok: false
  error: {
    code:
      | "INVALID_INPUT"
      | "UNAUTHORIZED"
      | "INTERNAL_ERROR"
      | "LENS_ACCOUNT_NOT_CONTROLLED"
      | "CHALLENGE_NOT_FOUND"
      | "CHALLENGE_ALREADY_USED"
      | "CHALLENGE_EXPIRED"
      | "INVALID_SIGNATURE"
      | "IDENTITY_ALREADY_LINKED"
    message: string
  }
}
```

典型调用：

```ts
try {
  const result = await server.verifyChallenge(payload)
  return NextResponse.json(result)
} catch (error) {
  const response = server.toErrorResponse(error)
  return NextResponse.json(response.body, { status: response.status })
}
```

### 重要说明

这个包本身不是一个会启动 HTTP 服务的 server。

它提供的是服务端认证逻辑，需要由宿主框架调用，例如：

- Next.js route handlers
- Express routes
- Nest controllers
- Fastify handlers

## `@demo/lens-login/shared`

入口文件：

```txt
packages/lens-login/src/shared/types.ts
```

职责：

- 定义共享领域类型
- 定义前后端请求响应协议
- 定义 client/server 的公共接口类型

当前主要提供：

### 请求响应类型

- `LensAccountsRequest`
- `LensAccountsResponse`
- `LensChallengeRequest`
- `LensChallengeResponse`
- `LensVerifyRequest`
- `LensVerifyResponse<TUser>`

### 领域类型

- `LensAuthIntent`
- `LensDiscoveredAccount`
- `LensVerifiedIdentity`

### Client Public API 类型

- `LensLoginClientOptions`
- `LensLoginClient<TUser>`

### Server Public API 类型

- `LensLoginServerOptions<TUser>`
- `LensLoginServer<TUser>`
- `LensLoginServerStorage`

其中 `LensLoginServerStorage` 是当前 server SDK 最重要的注入接口之一：

```ts
type LensLoginServerStorage = {
  createChallenge: (...) => Promise<LensLoginServerStoredChallenge>
  getChallengeById: (challengeId: string) => Promise<LensLoginServerStoredChallenge | null>
  markChallengeUsed: (challengeId: string) => Promise<unknown>
  getIdentityByProviderSubject: (providerSubject: string) => Promise<LensLoginServerStoredIdentity | null>
  createLensIdentity: (input: LensLoginServerCreateIdentityInput) => Promise<unknown>
}
```

它的作用是把 SDK 的认证内核和你的数据库实现解耦。

也就是说，SDK 自己不管你用：

- SQLite
- PostgreSQL
- Prisma
- Drizzle
- 自定义 ORM

只要你实现好这组 storage 接口，server SDK 就能工作。

## `packages/lens-login/src/index.ts`

职责：

- 聚合导出 client
- 聚合导出 server
- 聚合导出 shared types

它相当于整个 SDK 的统一 public surface。

## Demo 适配层

当前 demo 里还有一层桥接：

```txt
lib/lens/client.ts
lib/lens/server.ts
lib/lens/types.ts
```

这层的作用：

### `lib/lens/client.ts`

将 demo 重新导向 package client。

### `lib/lens/server.ts`

把 demo 里的具体实现注入到 SDK server：

- SQLite 数据存储
- 本地 user 查询与创建
- session cookie 建立

也就是说，当前 demo 的实际运行关系是：

```txt
Next API route
  -> lib/lens/server.ts
    -> @demo/lens-login/server
      -> SQLite / session adapter
```

## 当前这套分包最终解决了什么

### `client` 包

负责解决：

- 钱包连接
- challenge 请求
- 钱包签名
- verify 请求
- 前端登录流程编排

### `server` 包

负责解决：

- Lens account 查询
- challenge 生成
- 验签与防重放
- Lens identity 与本地 user 映射
- 登录与绑定分流

### `shared` 包

负责解决：

- 协议统一
- 类型统一
- client/server public API 一致性

## 一句话总结

当前 SDK 结构本质上是：

- `client`: 浏览器接入层
- `server`: 服务端认证内核
- `shared`: 协议与类型层
- `demo adapter`: 用 Next.js + SQLite 把整套流程跑起来

这已经是一个比较合理的 `SDK-only` 架构起点，后续可以继续扩展：

1. 独立构建产物
2. React hooks 层
3. Express / Next / Nest adapters
4. 更正式的接入文档
