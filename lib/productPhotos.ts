'use client'
import { createClient } from '@/lib/supabase'

// Photos for the built-in product catalog (Wikipedia / Wikimedia Commons).
const SEED_PHOTOS: Record<string, string> = {
  "Су (0.5л)": "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/ce/Water_Bottle_%2851308317077%29.jpg/250px-Water_Bottle_%2851308317077%29.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
  "Су (1.5л)": "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/ce/Water_Bottle_%2851308317077%29.jpg/250px-Water_Bottle_%2851308317077%29.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
  "Газды су": "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/59/Drinking_glass_00118.gif/250px-Drinking_glass_00118.gif?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
  "Шай (қара)": "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/8a/Cup_of_black_tea.JPG/250px-Cup_of_black_tea.JPG?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
  "Шай (жасыл)": "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/36/Green_tea_3_appearances.jpg/250px-Green_tea_3_appearances.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
  "Нескафе": "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/26/Instant_coffee.jpg/250px-Instant_coffee.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
  "Апельсин шырыны": "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/05/Orangejuice.jpg/250px-Orangejuice.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
  "Алма шырыны": "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/cf/Apfelsaft_im_Glas.jpg/250px-Apfelsaft_im_Glas.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
  "Кола": "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/27/Coca_Cola_Flasche_-_Original_Taste.jpg/250px-Coca_Cola_Flasche_-_Original_Taste.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
  "Fanta": "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c2/Fanta_2023.svg/250px-Fanta_2023.svg.png?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
  "Sprite": "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/29/A_cup_and_can_of_Sprite.jpg/250px-A_cup_and_can_of_Sprite.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
  "Айран": "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/8e/Fresh_ayran.jpg/250px-Fresh_ayran.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
  "Энергетик": "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/35/Energy_Drink_Display.jpg/250px-Energy_Drink_Display.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
  "Боржоми": "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/15/Borjomi_Bottle_0.5L_PET.jpg/250px-Borjomi_Bottle_0.5L_PET.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
  "Компот": "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/94/Compote.jpg/250px-Compote.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
  "Нан (ақ)": "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/2c/Wei%C3%9Fbrot-1.jpg/250px-Wei%C3%9Fbrot-1.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
  "Нан (қара)": "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d2/Market_Bread%2C_Riga%2C_Latvia.jpg/250px-Market_Bread%2C_Riga%2C_Latvia.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
  "Батон": "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/86/Baguettes%2C_Paris%2C_France_-_panoramio.jpg/250px-Baguettes%2C_Paris%2C_France_-_panoramio.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
  "Лаваш": "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b9/Pan_armenio_en_el_mercado_de_Yerevan.JPG/250px-Pan_armenio_en_el_mercado_de_Yerevan.JPG?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
  "Тоқаш": "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/10/Sesame_seed_hamburger_buns.jpg/250px-Sesame_seed_hamburger_buns.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
  "Сушки": "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/36/Sooshki.jpg/250px-Sooshki.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
  "Сухари": "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/79/Zwieback-1.jpg/250px-Zwieback-1.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
  "Печенье": "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b4/Bourbon_and_Custard_Cream.jpeg/250px-Bourbon_and_Custard_Cream.jpeg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
  "Крекер": "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/79/Crackers_with_herring_and_garlic_sauce.jpg/250px-Crackers_with_herring_and_garlic_sauce.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
  "Пряник": "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a2/Prjaniki.jpg/250px-Prjaniki.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
  "Сүт (1л)": "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a5/Glass_of_Milk_%2833657535532%29.jpg/250px-Glass_of_Milk_%2833657535532%29.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
  "Кефир": "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/83/Kefir_in_a_glass.JPG/250px-Kefir_in_a_glass.JPG?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
  "Сметана": "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a7/Borscht_served.jpg/250px-Borscht_served.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
  "Творог": "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/7b/Skimmed_milk_quark_on_spoon.jpg/250px-Skimmed_milk_quark_on_spoon.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
  "Йогурт": "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b8/Joghurt.jpg/250px-Joghurt.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
  "Ряженка": "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/37/Ryazhenka16c.JPG/250px-Ryazhenka16c.JPG?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
  "Сыр (қатты)": "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a8/Cheese_platter.jpg/250px-Cheese_platter.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
  "Сыр (балқытылған)": "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/8f/Eru_goudkuipje_sambal.jpg/250px-Eru_goudkuipje_sambal.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
  "Масло сливочное": "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d3/%C5%A0v%C3%A9dsk%C3%BD_kol%C3%A1%C4%8D_naruby_904_%28cropped%29.JPG/250px-%C5%A0v%C3%A9dsk%C3%BD_kol%C3%A1%C4%8D_naruby_904_%28cropped%29.JPG?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
  "Маргарин": "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/5c/Margarine.jpg/250px-Margarine.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
  "Қаймақ": "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/bf/Clotted_cream_%28cropped%29.JPG/250px-Clotted_cream_%28cropped%29.JPG?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
  "Шоколад": "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/cd/Green_and_Black%27s_dark_chocolate_bar_2.jpg/250px-Green_and_Black%27s_dark_chocolate_bar_2.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
  "Карамель": "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/13/HardCandy.jpg/250px-HardCandy.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
  "Ирис": "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f3/Thorntonstoffee.jpg/250px-Thorntonstoffee.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
  "Мармелад": "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/14/Fruit_flavoured_gumdrops.JPG/250px-Fruit_flavoured_gumdrops.JPG?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
  "Зефир": "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/ad/%D0%97%D0%B5%D1%84%D0%B8%D1%80_%D0%B1%D0%B5%D0%BB%D0%BE-%D1%80%D0%BE%D0%B7%D0%BE%D0%B2%D1%8B%D0%B9.jpg/250px-%D0%97%D0%B5%D1%84%D0%B8%D1%80_%D0%B1%D0%B5%D0%BB%D0%BE-%D1%80%D0%BE%D0%B7%D0%BE%D0%B2%D1%8B%D0%B9.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
  "Халва": "https://thumb.wikimedia.org/wikipedia/commons/thumb/4/4f/Orient_sweets_%28special_halva%29_Samarkand%2C_Siyab.jpg/250px-Orient_sweets_%28special_halva%29_Samarkand%2C_Siyab.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
  "Вафли": "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f7/Akbar_Mashti.JPG/250px-Akbar_Mashti.JPG?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
  "Козинак": "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0c/Gozinaki_with_walnuts.jpg/250px-Gozinaki_with_walnuts.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
  "Конфеты ассорти": "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/1a/Mary%27s_chocates_gift_box%2C_made_in_Japan.jpg/250px-Mary%27s_chocates_gift_box%2C_made_in_Japan.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
  "Чупа-чупс": "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/87/Chupa_Chups_logo.svg/250px-Chupa_Chups_logo.svg.png?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
  "Драже": "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/88/Liebesperlen.JPG/250px-Liebesperlen.JPG?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
  "Сосиска": "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b1/Hot_dog_with_mustard.png/250px-Hot_dog_with_mustard.png?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
  "Колбаса (пісірілген)": "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c3/Bologna_lunch_meat_style_sausage.JPG/250px-Bologna_lunch_meat_style_sausage.JPG?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
  "Колбаса (ысталған)": "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d8/Cervelas_2.jpg/250px-Cervelas_2.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
  "Шужық": "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/5b/%27Horse_meat_sausages%27_in_Chorsu_Bazaar.jpg/250px-%27Horse_meat_sausages%27_in_Chorsu_Bazaar.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
  "Тауық еті": "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/57/Chickens_in_market.jpg/250px-Chickens_in_market.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
  "Шпрот (консерва)": "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/2b/Odesa_bazaar_%285%29_sprats.JPG/250px-Odesa_bazaar_%285%29_sprats.JPG?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
  "Тунец (консерва)": "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/21/Tuna_assortment.png/250px-Tuna_assortment.png?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
  "Сардина (консерва)": "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f4/Sardine-tins.jpg/250px-Sardine-tins.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
  "Тұшпара (пельмень)": "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/df/Pelmeni_Russian.jpg/250px-Pelmeni_Russian.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
  "Алма": "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a6/Pink_lady_and_cross_section.jpg/250px-Pink_lady_and_cross_section.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
  "Банан": "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/de/Bananavarieties.jpg/250px-Bananavarieties.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
  "Апельсин": "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e3/Oranges_-_whole-halved-segment.jpg/250px-Oranges_-_whole-halved-segment.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
  "Лимон": "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e4/P1030323.JPG/250px-P1030323.JPG?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
  "Мандарин": "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/10/Citrus_reticulata_April_2013_Nordbaden.JPG/250px-Citrus_reticulata_April_2013_Nordbaden.JPG?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
  "Жүзім": "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/53/Grapes%2C_Rostov-on-Don%2C_Russia.jpg/250px-Grapes%2C_Rostov-on-Don%2C_Russia.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
  "Алмұрт": "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/cf/Pears.jpg/250px-Pears.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
  "Өрік": "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/2a/Apricot_and_cross_section.jpg/250px-Apricot_and_cross_section.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
  "Шабдалы": "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/9e/Autumn_Red_peaches.jpg/250px-Autumn_Red_peaches.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
  "Қарбыз": "https://thumb.wikimedia.org/wikipedia/commons/thumb/4/47/Taiwan_2009_Tainan_City_Organic_Farm_Watermelon_FRD_7962.jpg/250px-Taiwan_2009_Tainan_City_Organic_Farm_Watermelon_FRD_7962.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
  "Қауын": "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e7/Cantaloupe_and_canary_melon.jpg/250px-Cantaloupe_and_canary_melon.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
  "Клубника": "https://thumb.wikimedia.org/wikipedia/commons/thumb/4/4c/Garden_strawberry_%28Fragaria_%C3%97_ananassa%29_single2.jpg/250px-Garden_strawberry_%28Fragaria_%C3%97_ananassa%29_single2.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
  "Картоп": "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/ab/Patates.jpg/250px-Patates.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
  "Пияз": "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a2/Mixed_onions.jpg/250px-Mixed_onions.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
  "Сәбіз": "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a2/Vegetable-Carrot-Bundle-wStalks.jpg/250px-Vegetable-Carrot-Bundle-wStalks.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
  "Қырыққабат": "https://thumb.wikimedia.org/wikipedia/commons/thumb/6/6f/Cabbage_and_cross_section_on_white.jpg/250px-Cabbage_and_cross_section_on_white.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
  "Қияр": "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/96/ARS_cucumber.jpg/250px-ARS_cucumber.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
  "Қызанақ": "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/89/Tomato_je.jpg/250px-Tomato_je.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
  "Сарымсақ": "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/39/Allium_sativum_Woodwill_1793.jpg/250px-Allium_sativum_Woodwill_1793.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
  "Қызылша": "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/ae/Detroitdarkredbeets.png/250px-Detroitdarkredbeets.png?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
  "Болгар бурышы": "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/85/Green-Yellow-Red-Pepper-2009.jpg/250px-Green-Yellow-Red-Pepper-2009.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
  "Баклажан": "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/76/Solanum_melongena_24_08_2012_%281%29.JPG/250px-Solanum_melongena_24_08_2012_%281%29.JPG?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
  "Кабачок": "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/92/CSA-Striped-Zucchini.jpg/250px-CSA-Striped-Zucchini.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
  "Укроп/Петрушка": "https://thumb.wikimedia.org/wikipedia/commons/thumb/4/4b/Illustration_Anethum_graveolens_clean.jpg/250px-Illustration_Anethum_graveolens_clean.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
  "Күріш": "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0a/20201102.Hengnan.Hybrid_rice_Sanyou-1.6.jpg/250px-20201102.Hengnan.Hybrid_rice_Sanyou-1.6.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
  "Гречка": "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a7/Japanese_Buckwheat_Flower.JPG/250px-Japanese_Buckwheat_Flower.JPG?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
  "Макарон": "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/3f/%28Pasta%29_by_David_Adam_Kess_%28pic.2%29.jpg/250px-%28Pasta%29_by_David_Adam_Kess_%28pic.2%29.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
  "Сұлы жармасы": "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/97/Rolled_oats.jpg/250px-Rolled_oats.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
  "Манна жармасы": "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c6/Sa_semolina_far.jpg/250px-Sa_semolina_far.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
  "Тары": "https://thumb.wikimedia.org/wikipedia/commons/thumb/4/40/Mature_Proso_Millet_Panicles.jpg/250px-Mature_Proso_Millet_Panicles.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
  "Тұз": "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/7c/Rock_salt_%28halitite%29_%28Billianwala_Salt_Member%2C_Salt_Range_Formation%2C_Ediacaran_to_Lower_Cambrian%3B_Khewra_Salt_Mine%2C_Salt_Range%2C_Pakistan%29_14.jpg/250px-Rock_salt_%28halitite%29_%28Billianwala_Salt_Member%2C_Salt_Range_Formation%2C_Ediacaran_to_Lower_Cambrian%3B_Khewra_Salt_Mine%2C_Salt_Range%2C_Pakistan%29_14.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
  "Қант": "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/3c/Sucre_blanc_cassonade_complet_rapadura.jpg/250px-Sucre_blanc_cassonade_complet_rapadura.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
  "Ұн": "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0e/Soy_powder.jpg/250px-Soy_powder.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
  "Өсімдік майы": "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0f/OleicSunflowerOil.png/250px-OleicSunflowerOil.png?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
  "Кетчуп": "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f3/Ketchup_20160918_181342_%28cropped%29.jpg/250px-Ketchup_20160918_181342_%28cropped%29.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
  "Майонез": "https://thumb.wikimedia.org/wikipedia/commons/thumb/6/60/Mayonnaise_%281%29.jpg/250px-Mayonnaise_%281%29.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
  "Горчица": "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f4/Mustard.JPG/250px-Mustard.JPG?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
  "Сірке суы": "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c3/Eguilles_20110828_14.jpg/250px-Eguilles_20110828_14.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
  "Соевый соус": "https://thumb.wikimedia.org/wikipedia/commons/thumb/6/63/Soy_sauce_2.jpg/250px-Soy_sauce_2.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
  "Тушенка": "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/9c/Tushonka_beef.jpg/250px-Tushonka_beef.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
  "Бұршақ (консерва)": "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a0/Heaps_of_beans.jpg/250px-Heaps_of_beans.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
  "Жүгері (консерва)": "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/79/VegCorn.jpg/250px-VegCorn.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
  "Приправа": "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b6/Spices1.jpg/250px-Spices1.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
  "Бульон кубигі": "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f5/Br%C3%BChw%C3%BCrfel-1.jpg/250px-Br%C3%BChw%C3%BCrfel-1.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
  "Сода пищевая": "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/01/Baking_Powder.JPG/250px-Baking_Powder.JPG?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
  "Сабын (қатты)": "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/9b/Handmade_soap_cropped_and_simplified.jpg/250px-Handmade_soap_cropped_and_simplified.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
  "Сабын (сұйық)": "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/9b/Handmade_soap_cropped_and_simplified.jpg/250px-Handmade_soap_cropped_and_simplified.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
  "Шампунь": "https://thumb.wikimedia.org/wikipedia/commons/thumb/6/68/Dove_shampoo_bottle.jpg/250px-Dove_shampoo_bottle.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
  "Гель для душа": "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d4/Shower_Gel.jpg/250px-Shower_Gel.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
  "Тіс пастасы": "https://thumb.wikimedia.org/wikipedia/commons/thumb/4/49/Toothpasteonbrush.jpg/250px-Toothpasteonbrush.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
  "Тіс щеткасы": "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c3/Toothbrush_20050716_004.jpg/250px-Toothbrush_20050716_004.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
  "Дезодорант": "https://thumb.wikimedia.org/wikipedia/commons/thumb/4/42/Old_spice_deodorant_body_spray.jpg/250px-Old_spice_deodorant_body_spray.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
  "Туалет қағазы": "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a5/Toiletpapier_%28Gobran111%29.jpg/250px-Toiletpapier_%28Gobran111%29.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
  "Қағаз орамал": "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/54/Paper_towel.jpg/250px-Paper_towel.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
  "Кір жуғыш ұнтақ": "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/2a/Pralni_pra%C5%A1ek.JPG/250px-Pralni_pra%C5%A1ek.JPG?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
  "Ыдыс жуғыш": "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/71/Afwasmiddel.jpg/250px-Afwasmiddel.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
  "Мата жуғыш (кондиционер)": "https://thumb.wikimedia.org/wikipedia/commons/thumb/4/4a/Hallig_Hooge%2C_Germany%2C_view_from_the_Backenswarft.jpg/250px-Hallig_Hooge%2C_Germany%2C_view_from_the_Backenswarft.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
  "Мақта таяқшалары": "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f9/White_menbo.jpg/250px-White_menbo.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
  "Таңғыш (прокладки)": "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b8/Sanitary_towel.jpg/250px-Sanitary_towel.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
}

const norm = (s: string) => s.toLowerCase().replace(/ё/g, 'е').trim()

const SEED_BY_NAME = new Map(Object.entries(SEED_PHOTOS).map(([k, v]) => [norm(k), v]))

// Base words ("сүт", "нан", "кола"…) for matching hand-typed names, longest first.
const SEED_KEYWORDS: [string, string][] = Object.entries(SEED_PHOTOS)
  .map(([k, v]) => [norm(k.replace(/\(.*?\)/g, '').split('/')[0]), v] as [string, string])
  .filter(([k]) => k.length >= 2)
  .sort((a, b) => b[0].length - a[0].length)

// Whole-word form: "су" must not match "сусын".
const words = (s: string) => ' ' + s.split(/[^a-zа-яәіңғүұқөһ0-9]+/).filter(Boolean).join(' ') + ' '

export function productPhoto(p: { name: string; image_url?: string | null }, fallback: string): string {
  if (p.image_url) return p.image_url
  const n = norm(p.name)
  const exact = SEED_BY_NAME.get(n)
  if (exact) return exact
  const w = words(n)
  for (const [kw, url] of SEED_KEYWORDS) {
    if (w.includes(words(kw))) return url
  }
  return fallback
}

// Real packshot by barcode from Open Food Facts (free, CORS-enabled).
export async function lookupBarcodePhoto(code: string): Promise<{ image?: string; name?: string }> {
  try {
    const r = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=product_name,image_front_url,image_front_small_url`)
    if (!r.ok) return {}
    const j = await r.json()
    if (j.status !== 1) return {}
    return { image: j.product?.image_front_url || j.product?.image_front_small_url, name: j.product?.product_name }
  } catch {
    return {}
  }
}

export function compressImage(file: File, max = 600): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(max / img.width, max / img.height, 1)
      const c = document.createElement('canvas')
      c.width = Math.round(img.width * scale)
      c.height = Math.round(img.height * scale)
      c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
      URL.revokeObjectURL(url)
      c.toBlob(b => (b ? resolve(b) : reject(new Error('compress failed'))), 'image/jpeg', 0.85)
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('bad image')) }
    img.src = url
  })
}

export async function uploadProductPhoto(storeId: string, file: File): Promise<string> {
  const blob = await compressImage(file)
  const supabase = createClient()
  const path = `${storeId}/${crypto.randomUUID()}.jpg`
  const { error } = await supabase.storage.from('product-photos').upload(path, blob, { contentType: 'image/jpeg' })
  if (error) throw error
  return supabase.storage.from('product-photos').getPublicUrl(path).data.publicUrl
}
