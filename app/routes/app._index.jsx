import { useCallback, useEffect, useState } from "react";
import { json } from "@remix-run/node";
import { useActionData, useNavigation, useSubmit } from "@remix-run/react";
import {
  Layout,
  Button,
  BlockStack,
  Box,
} from "@shopify/polaris";
import {
  Checkbox,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { Image, Layer, Stage } from "react-konva";
import { authenticate } from "../shopify.server";
import PendantImage from "../PendantImage";
import PendantSelectionPanel from "../PendantSelectionPanel";
import useImage from "use-image";

const URLImage = ({ src, height, width, x = 0, y = 0, rotation = 0 }) => {
  const [image] = useImage(src);
  return <Image image={image} height={height} width={width} x={x} y={y} rotation={rotation} />;
};

export const loader = async ({ request }) => {
  await authenticate.admin(request);

  return null;
};
export const action = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const chainResponse = await admin.graphql(
    `#graphql
  query {
    collectionByHandle(handle: "chains") {
      id
      title
      handle
      products(first: 250) {
        edges {
         node {
            id
            title
            priceRangeV2 {
              maxVariantPrice {
                amount
              }
              minVariantPrice {
                amount
              }
            }
            featuredImage{
              altText
              url
            }
          }
        }
      }
    }    
  }`,
  );
  const pendantResponse = await admin.graphql(
    `#graphql
  query {
    collectionByHandle(handle: "pendants") {
      id
      title
      handle
      products(first: 250) {
        edges {
         node {
            id
            title
            priceRangeV2 {
              maxVariantPrice {
                amount
              }
              minVariantPrice {
                amount
              }
            }
            featuredImage{
              altText
              url
            }
          }
        }
      }
    }    
  }`,
  );
  const chainResponseJson = await chainResponse.json();
  const pendantResponseJson = await pendantResponse.json();
  return json({
    chainCollection: chainResponseJson.data.collectionByHandle,
    pendantCollection: pendantResponseJson.data.collectionByHandle
  });
};

export const CreateBundleForCart = async ({ ProductInput }) => {
  console.log(ProductInput);
  const { admin } = await authenticate.admin(ProductInput);
  const resp = await admin.graphql(
    `#graphql
    mutation CreateProductBundle($input: ProductInput!) {
  productCreate(input: $input) {
    product {
      title
      variants(first: 10) {
        edges{
          node{
            id
            price
          }
        }
      }
    }
    userErrors{
      field
      message
    }
  }
  }`,
  );
  const pendantResponseJson = await resp.json();
  return json({
    bundle: resp.data.productCreate
  });
};
export default function Index() {
  const nav = useNavigation();
  const actionData = useActionData();
  const submit = useSubmit();
  const isLoading =
    ["loading", "submitting"].includes(nav.state) && nav.formMethod === "POST";

  function selectProductUrlImages(product) {
    if (product == null || product.node == null) return null;
    const { url } = product.node?.featuredImage;
    const { id } = product.node;
    const { amount } = product.node.priceRangeV2.minVariantPrice;
    return { id, amount, url };
  }

  const blankObj = { id: '', url: '', amount: 0 };
  const [price, setPrice] = useState(0);
  const [isAddingPersonalNote, setIsAddingPersonalNote] = useState(false);
  const [personalNote, setPersonalNote] = useState("");
  const [centerpiece, setCenterpiece] = useState(blankObj);
  const [leftpiece, setLeftpiece] = useState(blankObj);
  const [rightpiece, setRightpiece] = useState(blankObj);
  const [chain, setChain] = useState(chains == null || chains.length == 0 ? blankObj : chains[0]);

  const UpdateChainUrls = () => {
    if (actionData == null) {
      return [];
    }
    // actionData.product.products.edges.forEach((node) => node?.id.replace("gid://shopify/Product/", ""));
    var temp = actionData.chainCollection.products.edges.map(selectProductUrlImages);
    if (chain == null) {
      setChain(temp[0]);
    }
    return temp;
  }
  const UpdatePendantUrls = () => {
    if (actionData == null) {
      return [];
    }
    // actionData.product.products.edges.forEach((node) => node?.id.replace("gid://shopify/Product/", ""));
    var temp = actionData.pendantCollection.products.edges.map(selectProductUrlImages);
    if (centerpiece == null) {
      setCenterpiece(temp[0]);
    }
    return temp;
  }

  const generateProduct = () => submit({}, { replace: true, method: "POST" });

  useEffect(() => {
    generateProduct();
  }, []);

  var chains = UpdateChainUrls();
  var pendants = UpdatePendantUrls();


  //useEffect only runs setPrice when [] list updates any values
  useEffect(() => {
    setPrice(Number(chain.amount) + Number(centerpiece.amount) + Number(leftpiece.amount) +
      Number(rightpiece.amount) + Number((isAddingPersonalNote === true ? 2 : 0)));
  }, [chain.amount, centerpiece.amount, leftpiece.amount, rightpiece.amount, isAddingPersonalNote]);


  //useCallback only calculates function (input,output dictionary values)
  //when a dependency value changes
  const handleOnCenterpieceChange = useCallback((newCenter) => {
    setCenterpiece(newCenter);
  }, []);

  const handleOnLeftpieceChange = useCallback((newLeft) => {
    setLeftpiece(newLeft);
  }, []);

  const handleOnRightpieceChange = useCallback((newRight) => {
    setRightpiece(newRight);
  }, []);
  const handleOnChainChange = useCallback((newChain) => {
    setChain(newChain);
  }, []);

  const onAddToCartClick = useCallback((e) => {
    CreateBundleForCart({
      "input": {
        "title": chain.title + centerpiece.title + leftpiece.title + rightpiece.title,
        "variants": [
          {
            "price": price
          }
        ]
      }
    });
  }, []);

  const handleAddPersonalNoteChange = useCallback((e) => {
    setIsAddingPersonalNote(e.target.checked);
  }, []);

  const handlePersonalNoteChange = useCallback((e) => {
    setPersonalNote(e.target.value);
  }, []);
  function UpdateChain() {
    if (!chain || chain.id == '') {
      setChain(chains[0]);
    }
  }
  useEffect(() => {
    if (chains.length > 0) {
      console.log("chains updated");
      console.log(chains);
      UpdateChain()
    }
  }, [chains]);
  return (
    <Paper >
      <ui-title-bar title="Remix app template">

      </ui-title-bar>
      <BlockStack gap="500">

        <Layout>
          <Paper
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: { xs: 1.75, sm: 4 },
              flexWrap: "wrap",
              py: 1,
              px: 0.5,
              borderRadius: "25px",
            }}
          >
            <BlockStack spacing={2} direction="row" sx={{ maxWidth: 1200 }}>
              <Layout>
                <Layout.Section>
                  <Paper sx={{ py: 2, px: 2 }}>
                    <Stack spacing={2}>
                      <Box sx={{ borderRadius: 2 }} width={500} height={600}>
                        <Stage width={500} height={600}>
                          <Layer>
                            {/* chain */}
                            <URLImage
                              src={chain?.url}
                              width={500}
                              height={600}
                            />
                          </Layer>
                          {/*centerpiece*/}
                          <PendantImage
                            newSrc={centerpiece?.url}
                            newWidth={300}
                            newHeight={300}
                            newX={100}
                            newY={255}
                            newRotation={0}
                          />
                          {/*leftpiece*/}
                          <PendantImage
                            newSrc={leftpiece?.url}
                            newWidth={300}
                            newHeight={300}
                            newX={180}
                            newY={170}
                            newRotation={45}
                          />
                          {/*rightpiece*/}
                          <PendantImage
                            newSrc={rightpiece?.url}
                            newWidth={300}
                            newHeight={300}
                            newX={100}
                            newY={380}
                            newRotation={-45}
                          />
                        </Stage>
                      </Box>
                      <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                        <Typography>Price: ${price}</Typography>
                        <Button onClick={onAddToCartClick} variant="outlined">
                          Add to Cart
                        </Button>
                      </Stack>
                      <Stack direction="row" sx={{ alignItems: "center" }}>
                        <Checkbox onChange={handleAddPersonalNoteChange} />
                        <Typography>Add a personal note (+$2)</Typography>
                      </Stack>
                      <TextField
                        disabled={!isAddingPersonalNote}
                        onChange={handlePersonalNoteChange}
                        value={personalNote}
                      />
                    </Stack>
                  </Paper>
                </Layout.Section>
                <Layout.Section variant="oneThird" height="100%">
                  <div style={{ overflowY: "scroll" }}>
                    <BlockStack spacing={2}>
                      <Paper sx={{ py: 2, px: 2 }}>
                        <BlockStack spacing={1}>
                          <Typography>Step 1: Choose your chain</Typography>
                          <BlockStack spacing={1} direction="row">
                            <Stack spacing={1} direction="row">
                              {Object.values(chains).map((ch) => (
                                <Box
                                  key={`chain-${ch.id}`}
                                  sx={{
                                    m: 0.5,
                                    borderRadius: 1,
                                    border: "1px solid lightgray",
                                    width: 25,
                                    height: 25,
                                    textAlign: "center",
                                    alignItems: "center",
                                    cursor: "pointer",
                                    ":hover": {
                                      backgroundColor: "lightgray",
                                    },
                                  }}
                                  onClick={() => handleOnChainChange(ch)}
                                >
                                  <img
                                    src={ch.url}
                                    alt={ch.id}
                                    objectFit="cover"
                                    width="100%"
                                    height="100%"
                                  />
                                </Box>
                              ))}
                            </Stack>
                          </BlockStack>
                        </BlockStack>
                      </Paper>
                      <PendantSelectionPanel
                        displayText={"Step 2: Choose your centerpiece"}
                        pendantOptions={pendants}
                        onPendantChange={handleOnCenterpieceChange}
                      />
                      <PendantSelectionPanel
                        displayText={"Step 3: Choose your leftpiece"}
                        pendantOptions={pendants}
                        onPendantChange={handleOnLeftpieceChange}
                      />
                      <PendantSelectionPanel
                        displayText={"Step 4: Choose your rightpiece"}
                        pendantOptions={pendants}
                        onPendantChange={handleOnRightpieceChange}
                      />
                    </BlockStack>
                  </div>
                </Layout.Section>
              </Layout>
            </BlockStack>
          </Paper>
        </Layout>
      </BlockStack>
    </Paper>
  );
}
