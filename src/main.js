/**
 * Функция для расчета выручки
 * @param purchase запись о покупке
 * @param _product карточка товара
 * @returns {number}
 */
function calculateSimpleRevenue(purchase, _product) {
    // Расчет выручки от операции
    // purchase — это одна из записей в поле items из чека в data.purchase_records
    // _product — это продукт из коллекции data.products
    const { discount, sale_price, quantity } = purchase;

    // Рассчитаем коэффициент скидки
    const discountCoefficient = 1 - (discount / 100);

    // Возвращаем выручку: цена * количество * коэффициент скидки
    return sale_price * quantity * discountCoefficient;
}

/**
 * Функция для расчета бонусов
 * @param index порядковый номер в отсортированном массиве
 * @param total общее число продавцов
 * @param seller карточка продавца
 * @returns {number}
 */
function calculateBonusByProfit(index, total, seller) {
    // Расчет бонуса от позиции в рейтинге
    const { profit } = seller;

    // Первое место 15% от прибыли
    if (index === 0) {
        return profit * 0.15;
    }
    // Второе и третье место 10% от прибыли
    else if (index === 1 || index === 2) {
        return profit * 0.10;
    }
    // Последнее место 0% бонуса
    else if (index === total - 1) {
        return 0;
    }
    // Все остальные 5% от прибыли
    else {
        return profit * 0.05;
    }
}

/**
 * Функция для анализа данных продаж
 * @param data
 * @param options
 * @returns {{revenue, top_products, bonus, name, sales_count, profit, seller_id}[]}
 */
function analyzeSalesData(data, options) {
    // Проверка входных данных
    if (
        !data ||
        !Array.isArray(data.sellers) ||
        !Array.isArray(data.products) ||
        !Array.isArray(data.purchase_records) ||
        data.sellers.length === 0 ||
        data.products.length === 0 ||
        data.purchase_records.length === 0
    ) {
        throw new Error("Некорректные входные данные");
    }

    // Проверка наличия опций
    if (typeof options !== "object" || options === null) {
        throw new Error("Опции должны быть объектом");
    }

    const { calculateRevenue, calculateBonus } = options; // Сюда передадим функции для расчётов

    // Проверка, что требуемые переменные определены
    if (!calculateRevenue || !calculateBonus) {
        throw new Error("Отсутствуют требуемые функции расчёта: calculateRevenue и calculateBonus");
    }

    // Проверка, что переменные — это функции
    if (typeof calculateRevenue !== "function" || typeof calculateBonus !== "function") {
        throw new Error("calculateRevenue и calculateBonus должны быть функциями");
    }

    // Подготовка промежуточных данных для сбора статистики
    const sellerStats = data.sellers.map(seller => ({
        seller_id: seller.id,
        name: `${seller.first_name} ${seller.last_name}`,
        sales_count: 0,
        revenue: 0,
        profit: 0,
        top_products: [],
        bonus: 0,
        products_sold: {},
    }));

    // Индексация продавцов и товаров для быстрого доступа
    const sellerIndex = Object.fromEntries(
        sellerStats.map(stat => [stat.seller_id, stat])
    );
    const productIndex = Object.fromEntries(
        data.products.map(product => [product.sku, product])
    );

    // Расчет выручки и прибыли для каждого продавца
    data.purchase_records.forEach(record => {
        // Продавец из индекса
        const seller = sellerIndex[record.seller_id];

        // Увелечение количества продаж
        seller.sales_count += 1;

        // Увелечение общей выручки чека
        seller.revenue += record.total_amount;

        // Обрабатка каждого товара в чеке
        record.items.forEach(item => {
            // Товар из индекса
            const product = productIndex[item.sku];

            // Рассчет себестоимости
            const cost = product.purchase_price * item.quantity;

            // Рассчет выручки через функцию расчета
            const revenue = calculateRevenue(item, product);

            // Рассчет прибыли
            const itemProfit = revenue - cost;

            // Увеличивание общую прибыль продавца
            seller.profit += itemProfit;

            // Учет количество проданных товаров
            if (!seller.products_sold[item.sku]) {
                seller.products_sold[item.sku] = 0;
            }
            seller.products_sold[item.sku] += item.quantity;
        });
    });

    // Сортировка продавцов по прибыли в убывающем порядке
    sellerStats.sort((a, b) => b.profit - a.profit);

    // Назначение бонусов и формирование топ-10 товаров
    sellerStats.forEach((seller, index) => {
        // Рассчет бонус на основе позиции в рейтинге
        seller.bonus = calculateBonus(index, sellerStats.length, seller);

        // Преобразование объект проданных товаров в отсортированный массив топ-10
        seller.top_products = Object.entries(seller.products_sold)
            .map(([sku, quantity]) => ({ sku, quantity }))
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 10);
    });

    // Формирование и возрашения итогового отчёта
    return sellerStats.map(seller => ({
        seller_id: seller.seller_id,
        name: seller.name,
        revenue: +seller.revenue.toFixed(2),
        profit: +seller.profit.toFixed(2),
        sales_count: seller.sales_count,
        top_products: seller.top_products,
        bonus: +seller.bonus.toFixed(2),
    }));
}
