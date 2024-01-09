"use strict";

const { createCoreController } = require("@strapi/strapi").factories;

module.exports = createCoreController("api::grocery.grocery", ({ strapi }) => ({
  async nestedData(ctx) {
    try {
      const groceries = await strapi.entityService.findMany(
        "api::grocery.grocery",
        { populate: "parent" }
      );

      const transformedData = organizeGroceryItems(groceries);

      ctx.send(transformedData);
    } catch (error) {
      console.error("Nested Data Errors:", error);
      ctx.send(
        { error: "An error occurred while fetching or transforming data." },
        500
      );
    }
  },

  async updateItem(ctx) {
    const { id } = ctx.params;
    const { data } = ctx.request.body;

    try {
      // Check if the item with the given ID exists
      const existingItem = await strapi.entityService.findOne(
        "api::grocery.grocery",
        id
      );

      if (!existingItem) {
        return ctx.notFound("Item not found");
      }

      // Check if the 'data' object has a 'name' property before accessing it
      if (data && data.name) {
        // Update the item
        const updatedGrocery = await strapi.entityService.update(
          "api::grocery.grocery",
          id,
          {
            data: {
              name: data.name,
              quantity: data.quantity,
              unit: data.unit,
              parent: data.parent,
            },
          }
        );

        // Send the updated item as a response
        ctx.send(updatedGrocery);
      } else {
        return ctx.badRequest("Invalid request data: 'name' is required.");
      }
    } catch (error) {
      console.error("Error updating item:", error);
      ctx.send({ error: "An error occurred while updating the item." }, 500);
    }
  },

  async deleteItemWithChildren(ctx) {
    try {
      const { id } = ctx.params;

      // Function to retrieve all items and organize them into a tree-like structure
      async function getAllItemsAndOrganize() {
        const allItems = await strapi.entityService.findMany(
          "api::grocery.grocery",
          { populate: "parent" }
        );

        const itemMap = new Map();
        const roots = [];

        allItems.forEach((item) => {
          itemMap.set(item.id, item);
        });

        allItems.forEach((item) => {
          if (item.parent) {
            const parentItem = itemMap.get(item.parent.id);
            if (!parentItem.children) {
              parentItem.children = [];
            }
            parentItem.children.push(item);
          } else {
            roots.push(item);
          }
        });

        return { allItems, itemMap, roots };
      }

      // Function to search for the node to delete
      async function findNode(node, targetId) {
        if (node.id == targetId) {
          console.log("Item found!");
          return node;
        }
        if (node.children) {
          for (const child of node.children) {
            const found = await findNode(child, targetId);
            if (found) {
              return found;
            }
          }
        }
        return null;
      }

      const { allItems, roots } = await getAllItemsAndOrganize();
      let existingItem = null;

      for (const rootNode of roots) {
        existingItem = await findNode(rootNode, id);
        if (existingItem) {
          break; // Exit the loop if the item is found
        }
      }

      if (!existingItem) {
        return ctx.notFound("Item not found");
      }

      async function deleteNodeAndDescendants(node) {
        if (node.children && node.children.length > 0) {
          for (const child of node.children) {
            await deleteNodeAndDescendants(child);
          }
        }

        await strapi.entityService.delete("api::grocery.grocery", node.id);
      }

      await deleteNodeAndDescendants(existingItem);

      async function transformToFlatNodes(node, flatNodes) {
        flatNodes.push(node); // Add the current node to flat nodes
        if (node.children) {
          for (const child of node.children) {
            await transformToFlatNodes(child, flatNodes);
          }
        }
      }

      const flatNodes = [];
      await transformToFlatNodes(existingItem, flatNodes);

      // Function to delete flat nodes
      async function deleteFlatNodes(flatNodes) {
        for (const node of flatNodes) {
          await strapi.entityService.delete("api::grocery.grocery", node.id);
        }
      }

      await deleteFlatNodes(flatNodes);

      // Send a success message
      ctx.send({ message: "Item and its descendants deleted successfully" });
    } catch (error) {
      console.error("Error deleting item and its descendants:", error);
      ctx.send(
        {
          error:
            "An error occurred while deleting the item and its descendants.",
        },
        500
      );
    }
  },

  async createItem(ctx) {
    const { name, quantity, unit, parentId } = ctx.request.body.data;
    try {
      // Create a new grocery item
      const newItem = await strapi.entityService.create(
        "api::grocery.grocery",
        {
          data: {
            name,
            quantity,
            unit,
            parent: parentId,
          },
          populate: "parent",
        }
      );

      // Send the newly created item as a response
      ctx.send(newItem);
    } catch (error) {
      console.error("Error creating item:", error);
      ctx.send({ error: "An error occurred while creating the item." }, 500);
    }
  },
}));

function organizeGroceryItems(items) {
  const itemMap = new Map();
  const roots = [];

  items.forEach((item) => {
    itemMap.set(item.id, item);
  });

  items.forEach((item) => {
    if (item.parent) {
      const parentItem = itemMap.get(item.parent.id);
      if (!parentItem.children) {
        parentItem.children = [];
      }
      parentItem.children.push(item);
    } else {
      roots.push(item);
    }
  });

  return roots;
}
