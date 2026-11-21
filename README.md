# Буся и цифры

В «Учить» карточки показывают числа от 1 до 10 и соответствующее количество фруктов, конфет или печений. После десятой карточки можно перейти к тесту. Тест также запускается из меню.

В тесте каждое количество от 1 до 10 встречается один раз за раунд. Порядок перемешивается заново при запуске. После второй ошибки предметы подсвечиваются по одному.

По умолчанию открывается жёлтая тема с полётом Буси и дракона после 5-го верного ответа и звёздным фейерверком после 10-го. Кнопка «Новый год» переключает оформление на зелёное со снегом, праздничными спрайтами и инструментальной Jingle Bells. Мелодия синтезируется в браузере. Кнопка «Музыка» управляет звуком. При возврате в жёлтую тему музыка останавливается, текущая карточка и прогресс теста сохраняются.

Новогодние награды — полёт над лесом на санях (18 секунд) и зажигание ёлки (22 секунды). Системная настройка уменьшения движения заменяет анимации статичными сценами.

- `demo.html` открывается в браузере как один файл и работает без сети.
- `index.html`, `styles.css`, `game.js`, `music.js` и `assets/` — исходники. После правок автономное демо собирается командой `node build-demo.js`.
- Весь прогресс хранится в памяти вкладки и сбрасывается при перезагрузке.

## Иллюстрации

Встроенный ImageGen создал три новогодних исходника. Спрайты сохранены в `assets/`: `candy.webp`, `cookie-star.webp`, `cookie-tree.webp`, `winter-apple.webp`, `winter-flight.webp`, `winter-tree.webp`.

> One transparent isolated 2 by 2 game sprite sheet with four equally sized quadrants and very wide empty gutters, each with exactly one countable object. Top left: one Christmas red and green twist-wrapped candy, horizontal with two wrapper ends. Top right: one five-point brown gingerbread cookie with white icing outline. Bottom left: one red apple with only a single leafy stem and small gold gift ribbon on stem. Bottom right: one gingerbread cookie shaped like a spruce tree with white and pale green icing. All same scale. Warm vintage Dutch nursery storybook gouache with paper texture and strong readable silhouettes, no backgrounds, no shadows, no text, no decorative particles whatsoever, all isolated and fully visible. Real transparent background.

> Transparent horizontal game sprite, one sharply isolated scene object, no scenery at all. The exact original child superhero from reference with pink mask, yellow chest star, raspberry cape and brown bob is sitting in a festive red wooden sled carrying two wrapped Christmas presents, leaning back joyfully and holding gold reins. A friendly mint-green baby dragon with two wings and red winter earmuffs is flying ahead and pulling the sleigh to the right. Whole group visible within canvas margin, show clear silhouettes even at small scale, portrait characters in profile or three quarter, transparent empty surroundings, NO drop shadow, NO sky, NO halo, NO imitation checkerboard, NO text. Rich pastel storybook gouache, warm wood toy colors.

> Transparent portrait sprite for a festive animation. The exact little girl superhero in attached reference in her pink mask, raspberry cape and yellow star chest emblem, and her tiny mint green dragon friend together stand beside and reach up towards a big beautiful full-size green Christmas tree with rosy and golden ornaments. The girl is putting the golden star at the top, lightly floating by the side of the upper tree; the dragon in a red scarf looks up from near the base. The entire decorated tree and entire characters must be fully in frame. One connected balanced tall festive composition. Delicate Dutch nursery storybook gouache, visible texture, red and gold accents. Completely transparent backdrop, no landscape, no text, no halos. Clear silhouette and comfortable edge padding.

Встроенный ImageGen создал один лист с четырьмя спрайтами. Иллюстрации нарезаны и сохранены с прозрачным фоном в `assets/`.

Для сцен использован тот же встроенный ImageGen с `assets/busya.webp` в качестве образца. Новые спрайты — `assets/busya-dragon.webp` и `assets/busya-balloon.webp`.

**Полёт с драконом**

> Create a new horizontal transparent game sprite, one single connected cutout of the original superhero girl from the attached reference flying side by side with a smiling baby dragon, both heading right. Keep her exact dusty pink superhero mask, raspberry cape, chest yellow star, brown bob and warm painterly storybook character. Girl in classic horizontal flight pose with her hand forward, green/teal baby dragon with big wings and a curling tail alongside her. Distinct readable silhouettes, full figures entirely inside the canvas. Dutch nursery storybook gouache and paper texture on the shapes. Transparent background, zero standalone decorations, no text, no border. The art will be animated across a sky in a counting game.

**Воздушный шар**

> Transparent game sprite, portrait composition. Draw ONE complete hot-air balloon including its entire large coral pink and golden cream striped round canopy, suspension ropes and wicker basket. In the wicker basket draw the exact original superhero girl from the attached reference (pink mask, brown bob, chest star, raspberry cape) along with an adorable tiny mint-green dragon. Both look joyfully up and the girl reaches out with one hand. Warm Dutch nursery gouache, storybook shadows and paper texture only on painted shapes, crisp uncluttered silhouette, fully isolated on truly transparent background, and all edges inside image with clear padding. The balloon should fill the frame vertically. Absolutely no large halos, glow, clouds, sky, stars, scenery, ground, detached props, lettering or graphic border. This single transparent PNG will rise in an animated celebratory digital scene.

**Исходный лист спрайтов**

> Children’s educational game, original illustration sprite sheet on genuine transparent background, square 1024px canvas with four strictly separate equal quadrants and wide empty gutters. TOP LEFT: full-body friendly little superhero girl, short brown hair, dusty rose outfit with a soft petal pink superhero mask and flowing raspberry cape, little yellow star chest emblem, one hand up waving, rosy cheeks, front-facing with feet, occupies most of quadrant with 25px padding. TOP RIGHT: one plump red apple with tiny stem and single green leaf. BOTTOM LEFT: one ripe golden yellow pear with green leaf. BOTTOM RIGHT: one small tangerine orange with green leaf. Each is a separate isolated cutout centered in its own quadrant, no overlaps, no other objects. Warm Dutch nursery picture-book mood, delicate gouache on paper visible only on shapes, rounded clean silhouettes, muted wood-toy colors, charming expressions on girl, no face on fruits, pale but clear contrast. No text, logos, outlines around cells, ground shadows or decorative marks.
