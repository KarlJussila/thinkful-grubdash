const path = require("path");

// Use the existing order data
const orders = require(path.resolve("src/data/orders-data"));

// Use this function to assigh ID's when necessary
const nextId = require("../utils/nextId");

function bodyHasProperties(request, response, next) {
  const { data: { deliverTo, mobileNumber, dishes } = {} } = request.body;
  if (!deliverTo) {
      next({
        status: 400,
        message: "Order must include a deliverTo",
      });
  }
  if (!mobileNumber) {
      next({
        status: 400,
        message: "Order must include a mobileNumber",
      });
  }
  if (dishes === undefined) {
      next({
        status: 400,
        message: "Order must include a dish",
      });
  }
  if (!(Array.isArray(dishes) && dishes.length > 0)) {
      next({
        status: 400,
        message: "Order must include at least one dish",
      });
  }
  dishes.forEach((dish, i) => {
      if (!Number.isInteger(dish.quantity) || dish.quantity <= 0) {
          next({
            status: 400,
            message: `Dish ${i} must have a quantity that is an integer greater than 0`,
          });
      }
  });
  next();
}

function create(request, response, next) {
  const { data: { deliverTo, mobileNumber, dishes } = {} } = request.body;
  const newOrder = {
    id: nextId(),
    deliverTo,
    mobileNumber,
    dishes,
    status: "delivered"
  };
  orders.push(newOrder);
  response.status(201).json({ data: newOrder });
}

function destroy(request, response) {
  const { orderId } = request.params;
  const index = orders.findIndex((order) => order.id === Number(orderId));
  orders.splice(index, 1);

  response.sendStatus(204);
}

function orderExists(request, response, next) {
  const { orderId } = request.params;
  const foundOrder = orders.find((order) => order.id == orderId);
  if (foundOrder) {
    response.locals.order = foundOrder;
    return next()
  }
  next({
    status: 404,
    message: `Order id not found: ${orderId}`,
  });
}

function validateDelete(request, response, next) {
    const order = response.locals.order;
    if (order.status != "pending") {
        next({
          status: 400,
          message: `An order cannot be deleted unless it is pending`,
        });
    }
    next();
}

function validateUpdate(request, response, next) {
    const order = response.locals.order;
    const { orderId } = request.params;
    const { data: { id, deliverTo, mobileNumber, status } = {} } = request.body;

    if (id && id != orderId) {
        next({
          status: 400,
          message: `Order id does not match route id. Order: ${id}, Route: ${orderId}.`,
        });
    }
    if (!status || !["pending", "preparing", "out-for-delivery", "delivered"].includes(status)) {
        next({
          status: 400,
          message: "Order must have a status of pending, preparing, out-for-delivery, delivered",
        });
    }
    if (order.status === "delivered") {
        next({
          status: 400,
          message: "A delivered order cannot be changed",
        });
    }
    next();
}

function list(request, response) {
  response.json({ data: orders });
}

function read(request, response, next) {
  response.json({ data: response.locals.order });
}

function update(request, response, next) {
  const order = response.locals.order;
  const { data: { deliverTo, mobileNumber, dishes, quantity } = {} } = request.body;

  order.deliverTo = deliverTo;
  order.mobileNumber = mobileNumber;
  order.dishes = dishes;
  order.quantity = quantity;

  response.json({ data: order });
}

module.exports = {
  create: [bodyHasProperties, create],
  list,
  read: [orderExists, read],
  update: [orderExists, bodyHasProperties, validateUpdate, update],
  delete: [orderExists, validateDelete, destroy],
};
