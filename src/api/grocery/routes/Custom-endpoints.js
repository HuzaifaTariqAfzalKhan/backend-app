module.exports = {
  routes: [
    {
      method: "GET",
      path: "/groceries/custom-nested-data",
      handler: "grocery.nestedData",
      config: {
        policies: [],
      },
    },
    {
      method: "POST",
      path: "/groceries/create-grocery",
      handler: "grocery.createItem",
      config: {
        policies: [],
      },
    },
    {
      method: "DELETE",
      path: "/groceries/custom-delete/:id",
      handler: "grocery.deleteItemWithChildren",
      config: {
        policies: [],
      },
    },
    {
      method: "PUT",
      path: "/groceries/custom-update/:id",
      handler: "grocery.updateItem",
      config: {
        policies: [],
      },
    },
  ],
};
