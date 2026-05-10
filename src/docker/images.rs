use bollard::image::{BuildImageOptions, CreateImageOptions, ListImagesOptions, TagImageOptions};
use bollard::models::{BuildInfo, ImageSummary};
use bytes::Bytes;
use futures_util::{Stream, StreamExt};

use crate::docker::{DockerClient, DockerError};

impl DockerClient {
    pub async fn pull_image(&self, name: &str, tag: &str) -> Result<(), DockerError> {
        let options = CreateImageOptions {
            from_image: name,
            tag,
            ..Default::default()
        };

        let mut stream = self.inner().create_image(Some(options), None, None);

        while let Some(result) = stream.next().await {
            result?;
        }

        Ok(())
    }

    pub async fn remove_image(&self, name: &str) -> Result<(), DockerError> {
        self.inner().remove_image(name, None, None).await?;
        Ok(())
    }

    pub fn build_image(
        &self,
        tag: &str,
        tar: Bytes,
    ) -> impl Stream<Item = Result<BuildInfo, DockerError>> + '_ {
        let options = BuildImageOptions {
            t: tag.to_string(),
            rm: true,
            forcerm: true,
            ..Default::default()
        };

        self.inner()
            .build_image(options, None, Some(tar))
            .map(|r| r.map_err(DockerError::Api))
    }

    pub async fn tag_image(&self, source: &str, repo: &str, tag: &str) -> Result<(), DockerError> {
        let options = TagImageOptions { repo, tag };
        self.inner().tag_image(source, Some(options)).await?;
        Ok(())
    }

    pub async fn list_images(
        &self,
        reference: Option<&str>,
    ) -> Result<Vec<ImageSummary>, DockerError> {
        let mut filters = std::collections::HashMap::new();
        if let Some(r) = reference {
            filters.insert("reference", vec![r]);
        }
        let options = ListImagesOptions {
            filters,
            ..Default::default()
        };
        let images = self.inner().list_images(Some(options)).await?;
        Ok(images)
    }
}
