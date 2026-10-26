# 专家与操作字段参考

本文件由 `scripts/build-references.mjs` 生成，请勿手工修改。重新生成：`node skills/listing-image/scripts/build-references.mjs`。

## 操作

### process-images

接口：`/api/process-images`

为一张或多张商品图生成白底图；图片数量受服务端上传配置限制。

| 名称 | 别名 | 类型 | 必填 | 默认值 | 说明 | 生效 |
|---|---|---|---|---|---|---|
| images | — | file[] | 是 | — | 要处理的商品图片。 | 是 |

### generate-scene-text

接口：`/api/generate-scene`

根据文字方向与商品图生成场景图。

| 名称 | 别名 | 类型 | 必填 | 默认值 | 说明 | 生效 |
|---|---|---|---|---|---|---|
| productImage | — | file | 是 | — | 要放入生成场景的商品原图。 | 是 |
| visualExpertMode | — | string | 否 | none | 选择提示词专家模式；未知值按通用模式处理。 | 是 |
| promptText | — | string | 否 | — | 生成方向；部分模式会在缺省时采用内置文字。 | 是 |

### generate-scene-image

接口：`/api/generate-scene`

参考商品图和场景图生成场景图。

| 名称 | 别名 | 类型 | 必填 | 默认值 | 说明 | 生效 |
|---|---|---|---|---|---|---|
| productImage | — | file | 是 | — | 要放入场景的商品原图。 | 是 |
| sceneImage | — | file | 是 | — | 用作场景参考的图片。 | 是 |
| promptText | — | string | 否 | Place the product naturally in the scene | 描述如何结合商品图与场景图；留空时使用通用场景指令。 | 是 |

### edit-image

接口：`/api/edit-image`

按提示词编辑标注图，可选提供未标注原图作为对照。

| 名称 | 别名 | 类型 | 必填 | 默认值 | 说明 | 生效 |
|---|---|---|---|---|---|---|
| annotatedImage | — | file | 是 | — | 带有彩色编辑标记的图片。 | 是 |
| originalImage | — | file | 否 | — | 可选的未标记原图。 | 是 |
| promptText | — | string | 是 | — | 描述要在标记区域执行的编辑。 | 是 |

## 专家

### 设计师（`designer`）

何时使用：生成亚马逊 A+ 内容模块设计图。

| 名称 | 别名 | 类型 | 必填 | 默认值 | 说明 | 生效 |
|---|---|---|---|---|---|---|
| productName | — | string | 否 | 产品 | 商品名称，用于提示词中的商品称呼。 | 是 |

### 商品展示（`productShowcase`）

何时使用：需要生活方式场景展示图，且不出现全身人物。
注意：可出现半身或身体的部分。

| 名称 | 别名 | 类型 | 必填 | 默认值 | 说明 | 生效 |
|---|---|---|---|---|---|---|
| productName | — | string | 否 | 产品 | 商品名称，用于提示词中的商品称呼。 | 是 |
| sceneTone | — | string | 否 | 自动识别 | 希望场景传达的氛围。 | 是 |

### 商品信息图（`productInfographic`）

何时使用：需要通过可视化设计展示商品信息，画面不出现人物。

| 名称 | 别名 | 类型 | 必填 | 默认值 | 说明 | 生效 |
|---|---|---|---|---|---|---|
| productName | — | string | 否 | 产品 | 商品名称，用于提示词中的商品称呼。 | 是 |
| infographicTone | — | string | 否 | 清晰、专业、现代 | 信息图的整体表达风格。 | 是 |
| textOverlay | — | string | 否 | — | 希望出现在图中的文字内容。 | 是 |
| keywords | — | string[] | 否 | — | 要突出的关键词，最多采用 12 项。 | 是 |

### 商品广告（`productAdvertisement`）

何时使用：需要带英文文案的商品广告图。

| 名称 | 别名 | 类型 | 必填 | 默认值 | 说明 | 生效 |
|---|---|---|---|---|---|---|
| productName | — | string | 否 | 产品 | 商品名称，用于提示词中的商品称呼。 | 是 |
| brandEssence | — | string | 否 | 高级、精致、可信、创新 | 品牌要传达的核心气质。 | 是 |
| targetAudience | — | string | 否 | 根据商品图片与类目推断的高意向购买人群 | 广告面向的人群。 | 是 |
| adGoal | — | string | 否 | 激发购买欲并提升品牌信任 | 广告要达成的目标。 | 是 |
| keySellingPoints | — | string[] | 否 | — | 要展示的商品卖点，最多采用 12 项。 | 是 |

### 视觉美陈策展（`visualFeastCurator`）

何时使用：需要无人物、聚焦商品美学陈列的商业图。
注意：模板要求融入英文行动号召；当前 callToActionText 输入不会替换模板中的字面字段名。

| 名称 | 别名 | 类型 | 必填 | 默认值 | 说明 | 生效 |
|---|---|---|---|---|---|---|
| productDescription | product_description | string | 否 | 高端商品美学陈列 | 描述陈列主体；留空时可由 promptText 提供，二者都为空时使用默认描述。 | 是 |
| productImageStyle | product_image_style | string | 否 | 高分辨率商品图 | 商品图的呈现方式。 | 是 |
| aestheticStyle | aesthetic_style | string | 否 | 极简主义艺术装置 | 陈列采用的美学风格。 | 是 |
| colorPalette | color_palette | string | 否 | 与商品主色调和谐的对比色系 | 陈列使用的色彩搭配。 | 是 |
| lighting | — | string | 否 | 博物馆级聚光照明，强调材质和轮廓 | 商品陈列的灯光效果。 | 是 |
| compositionStrategy | composition_strategy | string | 否 | 黄金比例与对称/非对称几何构图 | 商品与辅助元素的构图方式。 | 是 |
| backgroundElements | background_elements | string | 否 | 抽象几何形状、渐变光影、高级纹理材质 | 陈列采用的背景元素。 | 是 |
| textIntegrationStyle | text_integration_style | string | 否 | 融入构图的艺术字体，与视觉元素和谐统一 | 模板所要求的英文文案与画面的融合方式。 | 是 |
| callToActionText | call_to_action_text | string | 否 | — | 模板当前不替换此输入，传入后不会影响生成提示词。 | 否 |

### 社交故事策展（`socialStoryCurator`）

何时使用：需要适合社交媒体分享的生活随拍风格图片和配套文案。

| 名称 | 别名 | 类型 | 必填 | 默认值 | 说明 | 生效 |
|---|---|---|---|---|---|---|
| productImageDescription | product_image_description | string | 否 | — | 商品图的外观与功能描述；留空时由商品名与上传图片生成默认描述。 | 是 |
| userIntent | user_intent | string | 否 | — | 希望通过分享表达的意图；留空时使用 promptText 或内置方向。 | 是 |
| productName | product_name | string | 否 | 产品 | 商品名称，用于提示词中的商品称呼。 | 是 |
| sceneDescription | scene_description | string | 否 | 日常生活场景 | 商品出现的日常场景。 | 是 |
| targetAudienceKeywords | target_audience_keywords | string | 否 | 根据商品定位智能判断 | 目标受众及其关注点。 | 是 |
| toneOfVoice | tone_of_voice | string | 否 | 轻松, 真实, 有趣 | 社交文案的表达语气。 | 是 |
| includePerson | include_person | boolean | 否 | true | 是否在场景中融入人物；无效布尔文本按 true 处理。 | 是 |
| callToAction | call_to_action | string | 否 | — | 可选的行动号召文案。 | 是 |

### 通用（`none`）

何时使用：使用通用商品场景提示词，不选择专家模式。

| 名称 | 别名 | 类型 | 必填 | 默认值 | 说明 | 生效 |
|---|---|---|---|---|---|---|
